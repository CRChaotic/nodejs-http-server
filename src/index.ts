import * as http from "http";
import download from "./middlewares/download";
import send from "./middlewares/send";
import sendFile from "./middlewares/sendFile";
import staticAssets from "./middlewares/staticAssets";
import Pipeline from "./Pipeline";
import { Context, Middleware, Request, Response } from "./types";
import resovleMultipartFormData from "./middlewares/resolveMultipartFormData";
import queryString from "node:querystring";
import resolveURLEncodedFormData from "./middlewares/resolveURLEncodedFormData";
import cookies from "./middlewares/cookies";
import redirect from "./middlewares/redirect";
import secureFrame from "./middlewares/secureFrame";
import secureTypeSniff from "./middlewares/secureTypeSniff";


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

    const regExp = new RegExp("^"+path.replace(/:([^/]+)/g, "(?<$1>[^/]+)")+"$");

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

addRoute("GET", "/math/:id/suffix", (req, res) => {
    console.log(req.cookies);
    res.setHeader('Set-Cookie', ["SESSIONID="+Math.random()*100+"; path=/; samesite=strict; HttpOnly"]);
    res.setHeader('Set-Cookie', ["S="+Math.random()*100+"; path=/; samesite=strict; HttpOnly"]);

    console.log({params:req.params, queries:req.queries});
    res.send({params:req.params, queries:req.queries});
});


addRoute("GET", "/download", (req, res) => {
    res.download({root:"upload", filename:"str.c"});
});

addRoute("POST", "/multipart", (req, res) => {
    
    const multipart = req.multipart;
    const {file} = multipart.files;

    console.log(multipart);
    res.end();
    // writeFile(`./upload/${file.filename}`, file.value, (err) => {
    //     if (err) throw err;
    //     console.log('The file has been saved!');
    //     res.send({fields:multipart.fields, filename:file.filename, size:file.value.length}, 201);
    // });

});

addRoute("GET", "/*", (req, res) => {
    res.sendFile({root:"src/views", filename:"404.html"});
});

addRoute("GET", "/redirect", (req, res) => {
    res.redirect("https://www.bing.com");
});

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
                res.setHeader("Content-Type", "text/html");
                res.write("<h1>Oops route does not exist<h1>");
                res.end();
            };

            route = {regExp:/\/\*/, callback:Fallback.get(method)??defaultCallback}
        }

        req.queries = queries;
        req.params = params;
        route.callback(req, res);

    }

    return run;
}

export type ContentSecurityPolicyDirectives = {
    defaultSrc?: string[]
    scriptSrc?: string[];
    styleSrc?: string[]; 
    imgSrc?: string[];
    mediaSrc?: string[];
    fontSrc?: string[];
    frameAncestors?: string[]; 
    frameSrc?: string[];
    formAction?: string[];
    objectSrc?: string[];
    manifestSrc?:string[];
    workSrc?: string[];
    baseUri?: string[];
    sandbox?: string[];
}

function secureContent(contentSecurityPolicyDirectives:ContentSecurityPolicyDirectives={}){

    const directives:string[] = [];

    if(!contentSecurityPolicyDirectives.defaultSrc){
        directives.push("default-src 'self'");
    }
    
    for(let [directive, values] of Object.entries(contentSecurityPolicyDirectives)){
        const hyphenPosition = Array.prototype.findIndex.call(directive, (char:string) => /[A-Z]/.test(char));
        if(hyphenPosition !== -1){
            directive = directive.slice(0, hyphenPosition) + "-" + directive.slice(hyphenPosition).toLocaleLowerCase();
        }
        directives.push(directive + " " + values.join(" "));
    }

    const contentSecurityPolicyHeader = directives.join("; ");

    const wrappedSetHeader = (setHeader:Function, getHeader:Function) => {
        return function (name:string, value: string | number | readonly string[]):Response {
            const newRes = setHeader.apply(this, [name, value]);
   
            const type:string|null = getHeader.apply(this, ["Content-Type"]);
            if(type && type.includes("text/html")){
                setHeader.apply(this, ["Content-Security-Policy", contentSecurityPolicyHeader]);
            }

            return newRes;
        }
    }

    const run:Middleware<Context> = ({req, res}, next) => {

        if(req.method === "GET"){
            res.setHeader = wrappedSetHeader(res.setHeader, res.getHeader);
        }
        
        next();
    };

    return run;
}



const pipeLine = Pipeline<Context>(
    secureFrame(),
    secureTypeSniff(),
    secureContent({frameAncestors:["'self'"]}),
    cookies(),
    redirect(),
    sendFile(),
    send(),
    download(),
    resolveURLEncodedFormData(),
    resovleMultipartFormData(),
    staticAssets({root:"build"}),
    route(),
    (ctx, next, error) => {
        console.log("handle error:",error);
    }
);

const app = http.createServer((req, res) => {

    pipeLine.execute({req, res});

});

app.listen(port);
