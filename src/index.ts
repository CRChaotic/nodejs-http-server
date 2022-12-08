import { writeFile } from "fs";
import * as http from "http";
import path from "path";
import download from "./middlewares/download";
import send from "./middlewares/send";
import sendFile from "./middlewares/sendFile";
import staticAssets from "./middlewares/staticAssets";
import Pipeline from "./Pipeline";
import { Context, Middleware, Request, Response } from "./types";
import resovleMultipartFormData from "./middlewares/resolveMultipartFormData";
import queryString from "node:querystring";
import isJSON from "./utils/isJSON";
import { testMultipartParser } from "./MultipartParser";
import resolveURLEncodedFormData from "./middlewares/resolveURLEncodedFormData";


type Callback = (
    req:Request,
    res:Response
) => void; 

type Route = {
    regExp:RegExp; 
    callback:Callback;
}

type Method = "GET"|"POST"|"PUT"|"DELETE"|"HEAD"|"OPTIONS";

const GetRoute = new Map<string, Route>();
const PostRoute = new Map<string, Route>();
const DeleteRoute = new Map<string, Route>();
const PutRoute = new Map<string, Route>();
const OptionsRoute = new Map<string, Route>();
const HeadRoute = new Map<string, Route>();
const Fallback = new Map<Method, Callback>();
const port = 8080;


function addRoute(method:Method, path:string, callback:Callback){

    const regExp = new RegExp("^"+path.replace(/{(\w+)}/g, "(?<$1>[^/]+)")+"$");

    console.info("[INFO] Add route:", {path, regExp});

    if(path === "/*"){
        Fallback.set(method, callback);
        return;
    }

    switch(method){
        case "GET":
            GetRoute.set(path, {regExp, callback});
            break;
        case "POST":
            PostRoute.set(path, {regExp, callback});
            break;
        case "DELETE":
            DeleteRoute.set(path, {regExp, callback});
            break;
        case "PUT":
            PutRoute.set(path, {regExp, callback});
            break;
        case "OPTIONS":
            OptionsRoute.set(path, {regExp, callback});
            break;
        default:
            throw new Error("method must be one of get, post, put, delete, options or head");
    }
}

addRoute("POST", "/form", (req, res) => {
    console.log("resovled form:",req.form);
    res.send(req.form);
});

addRoute("GET", "/math/{id}", (req, res) => {
    // res.sendFile("../server/build/index.html");
    console.log({params:req.params, queries:req.queries});
    res.send({params:req.params, queries:req.queries});
});


addRoute("GET", "/download", (req, res) => {
    res.download({filepath:path.resolve("./upload/v.mp4")});
});

addRoute("POST", "/multipart", (req, res) => {
    
    const multipart = req.multipart;
    const {file} = multipart.files;

    // console.log(multipart);
    // res.end();
    writeFile(`./upload/${file.filename}`, file.value, (err) => {
        if (err) throw err;
        console.log('The file has been saved!');
        res.send({fields:multipart.fields, filename:file.filename, size:file.value.length}, 201);
    });

});

addRoute("GET", "/*", (req, res) => {
    res.send("<h1>404</h1>", 404);
});


function parseURLEncodedFormData(body:string){

    const form:{[k:string]:any} = {};

    body.split("&").forEach((pair) => {

        let [key, value] = pair.split("=").map(decodeURIComponent);

        if(isJSON(value)){
            value = JSON.parse(value);
        }

        const matched = key.match(/^\s*(?<fieldName>\w+)\s*\[(?<prop>[\w-]*)\]\s*$/);
        if(matched){

            const fieldName = matched.groups?.fieldName.trim();
            const prop = matched.groups?.prop;
            if(fieldName != null && fieldName !== ""){

                if(!form[fieldName]){
                    form[fieldName] = {};
                }

                if(prop == null){
                    form[fieldName] = value;
                }else if(prop === ""){
                    const index = Object.keys(form[fieldName]).length;
                    form[fieldName][index] = value;
                }else if(typeof prop === "string"){
                    form[fieldName][prop] = value;
                }
            }
            
        }else{
            form[key] = value;
        }

    });

    return form;
}

function route(){

    const run:Middleware<Context> = ({req, res}, next) => {

        const method = req.method;
        let routeMap:Map<string, Route>|null = null;

        switch(method){
            case "GET":
                routeMap = GetRoute;
                break;
            case "POST":
                routeMap = PostRoute;
                break;
            case "PUT":
                routeMap = PutRoute;
                break;
            case "DELETE":
                routeMap = DeleteRoute;
                break;
            case "OPTIONS":
                routeMap = OptionsRoute;
                break;
            case "HEAD":
                routeMap = HeadRoute;
                break;
            default:
                throw new Error("Middleware<route>: request method is not spported");
        }

        if(!routeMap){
           next();
           return;
        }

        const url = new URL(req.url??"/", `http://${req.headers.host}`);
        const path = url.pathname;

        let queries = queryString.parse(url.search.slice(1));
        let params = {};
        let route = routeMap.get(path);

        //try out relative route
        if(!route){
            
            for(let relativeRoute of routeMap.values()){

                const matched = path.match(relativeRoute.regExp);
    
                if(matched && matched.groups){
                    // console.log(matched);
                    params = matched.groups;
                    route = relativeRoute;
                    break;
                }
            }
        }

        //fallback route
        if(!route){

            res.statusCode = 404;
            const defaultCallback:Callback = (req, res) => {
                res.write("<h1>Oops route does not exist<h1>");
                res.end();
            };

            route = {regExp:/\/\*/, callback:Fallback.get(method)??defaultCallback}
        }

        req.queries = queries;
        req.params = params;
        route.callback(req, res);
        console.log("router!");

    }

    return run;
}


function get(){

    const run:Middleware<Context> = ({req, res}, next) => {

        let hasRoute = false;

        if(req.method === "GET"){

            const url = new URL(req.url??"/", `http://${req.headers.host}`);
            const path = url.pathname;
            const queries = queryString.parse(url.search.slice(1));

            const route =  GetRoute.get(path);

            if(route){
                req.queries = queries;
                req.params = {};

                route.callback(req, res);

                hasRoute = true;
            }else{

                for(let relativeRoute of GetRoute.values()){

                    const matched = path.match(relativeRoute.regExp);

                    if(matched){
                        // console.log(matched);
                        req.queries = queries;
                        req.params = matched.groups;
                        relativeRoute.callback(req, res);

                        hasRoute = true;
                        break;
                    }

                }
            }
        }

        if(!hasRoute){
            next();
        }

    };

    return run;
}



const pipeLine = Pipeline<Context>(
    sendFile(),
    send(),
    download(),
    resolveURLEncodedFormData(),
    resovleMultipartFormData(),
    staticAssets("../../build"),
    // get(),
    // post(),
    route(),
    (ctx, next, error) => {
        console.log("handle error:",error);
    }
);

console.log(path.resolve("./build"))
const app = http.createServer(async (req, res) => {

    const url = new URL(req.url!, `http://${req.headers.host}`);

    pipeLine.execute({req, res});

});

app.listen(port);

testMultipartParser();