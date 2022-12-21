import download from "./middlewares/download";
import send from "./middlewares/send";
import sendFile from "./middlewares/sendFile";
import staticAssets from "./middlewares/staticAssets";
import resovleMultipartFormData from "./middlewares/resolveMultipartFormData";
import resolveURLEncodedFormData from "./middlewares/resolveURLEncodedFormData";
import requestCookie from "./middlewares/requestCookie";
import redirect from "./middlewares/redirect";
import secureFrame from "./middlewares/secureFrame";
import secureContent from "./middlewares/secureContent";
import secureOpener from "./middlewares/secureOpener";
import Router from "./router/Router";
import Pipeline from "./Pipeline";
import { Context } from "./Context";
import { readFileSync } from "fs";
import { randomUUID } from "crypto";
import responseCookie from "./middlewares/responseCookie";
import { Request } from "./Request";
import { Response } from "./Response";
import { createSecureServer } from "http2";
import secureTransport from "./middlewares/secureTransport";
import session from "./middlewares/session";
import InMemorySessionStorage from "./InMemorySessionStorage";

const port = 8080;

const router = new Router();
const sessionStorage = InMemorySessionStorage();
router.addRoute("GET", "/cookie", async (req, res) => {
    console.log(req.httpVersion);
    const id = randomUUID();
    res.setCookie("__Host-SESSION_ID", id);
    sessionStorage.set(id, {v:"test value:"+Date.now()});
    res.end("set cookie");
}).addRoute("GET", "/*", (req, res) => {
    res.sendFile("src/views/404.html");
}).addRoute("POST", "/form", (req, res) => {
    console.log("resovled form:",req.form);
    res.send(req.form);
}).addRoute("POST", "/multipart", (req, res) => {
    const multipart = req.multipart;
    const {file} = multipart.files;
    // console.log(multipart);
    res.send({fields:multipart.fields, filename:file?.filename, size:file?.value.length}, 201);
    // writeFile(`./upload/${file.filename}`, file.value, (error) => {
    //     if (error) throw error;
    //     res.send({fields:multipart.fields, filename:file.filename, size:file.value.length}, 201);
    // });
}).addRoute("GET", "/math/:id/suffix", (req, res) => {

    res.send({params:req.params, queries:req.queries});
}).addRoute("GET", "/redirect", (req, res) => {
    res.redirect("https://www.bing.com");
}).addRoute("GET", "/download", (req, res) => {
    res.download("upload/str.c");
}).addRoute("GET", "/session", async (req, res) => {
    const id = req.cookie["__Host-SESSION_ID"];
    let session:any = null; 
    if(id != null){
        session = await sessionStorage.get(id);
    }
    console.log(session);
    res.send(session.value);
}).addRoute("POST", "/login", async (req, res) => {

    if(req.form.username === "ryan"){
        await req.session.save({username:req.form.username}, {generateID:true,maxAge:10});
        const length = await req.session.getLength();
        console.log({length});
        res.redirect("/home");
    }else{
        res.redirect("/login");
    }

}).addRoute("GET", "/login", async (req, res) => {

    const session = await req.session.get();
    if(session?.username){
        res.redirect("/home");
        return;
    }
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.write(`
        <form action="/login" method="post">
            username:<input type="text" name="username"><br/>
            <button type="submit">submit</button>
        <form>
    `);
    res.end();

}).addRoute("GET", "/home", async (req, res) => {
    const session = await req.session.get();
    if(session){
        console.log(session);
        res.send(session);
    }else{
        res.redirect("/login");
    }
});


const pipeLine = new Pipeline<Context>([
    send(), 
    sendFile(),
    redirect(),
    requestCookie(),
    responseCookie(),
    resovleMultipartFormData(),
    resolveURLEncodedFormData(),
    download(),
    secureFrame(),
    secureContent({directives:{frameAncestors:["'none'"]}}),
    secureOpener(),
    secureTransport({maxAge:60}),
    session("__Host-SID", InMemorySessionStorage()),
    staticAssets({root:"build"}),
    router
], [{
    handle(error, {response}) {
        console.log(error);
        response.statusCode = 400;
        response.end("Bad Request");
    },
}]);

const server = createSecureServer({
    key: readFileSync('./private/localhost.key'),
    cert: readFileSync('./private/localhost.crt')
});

server.on("request", (req, res) => {

    const request = req as Request;
    const response = res as Response;

    pipeLine.execute({request, response});

})
server.listen(8080);