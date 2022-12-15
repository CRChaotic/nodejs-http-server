import * as http from "http";
import download from "./middlewares/download";
import send from "./middlewares/send";
import sendFile from "./middlewares/sendFile";
import staticAssets from "./middlewares/staticAssets";
import Pipeline, { MiddlewareBeta, PipelineBeta } from "./Pipeline";
import { Context, Middleware, Next, Request, Response } from "./types";
import resovleMultipartFormData from "./middlewares/resolveMultipartFormData";
import queryString from "node:querystring";
import resolveURLEncodedFormData from "./middlewares/resolveURLEncodedFormData";
import cookies from "./middlewares/cookies";
import redirect from "./middlewares/redirect";
import secureFrame from "./middlewares/secureFrame";
import secureContent from "./middlewares/secureContent";
import secureOpener from "./middlewares/secureOpener";
import Router from "./router/Router";


type Callback = (
    req:Request,
    res:Response
) => Promise<void>|void; 

type Route = {
    regExp:RegExp; 
    callback:Callback;
}

type Method = "GET"|"POST"|"PUT"|"DELETE"|"HEAD"|"OPTIONS";

const GetRoute = new Map<string, Route>();
const PostRoute = new Map<string, Route>();
const DeleteRoute = new Map<string, Route>();
const PutRoute = new Map<string, Route>();
const HeadRoute = new Map<string, Route>();
const OptionsRoute = new Map<string, Route>();
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
        case "HEAD":
            HeadRoute.set(path, {regExp, callback});
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
    console.log({headers:req.headers});
    res.download("upload", "str.c");
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
    res.sendFile("src/views", "404.html");
});

addRoute("GET", "/redirect", (req, res) => {
    res.redirect("https://www.bing.com");
});

const router = new Router();
router.addRoute("GET", "/", (req, res) => {
    res.end("Yo !");
})

const pipeLine = new PipelineBeta<Context>([router], []);

const app = http.createServer((req, res) => {

    pipeLine.execute({req, res});

});

app.listen(port);

// const corsTest = http.createServer((req, res) => {
//     pipeLine.execute({req, res});
// });

// corsTest.listen(8081);