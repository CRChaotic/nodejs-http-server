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
import WebSocket, { WebSocketMessage } from "./websocket/WebSocket";
import WebSocketServer from "./websocket/WebSocketServer";
import SimpleAuthorizerImpl from "./websocket/SimpleAuthorizerImpl";

const port = 8080;

const router = new Router();

router.addRoute("GET", "/cookie", async (req, res) => {
    console.log(req.httpVersion);
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

}).addRoute("POST", "/login", async (req, res) => {

    if(req.form.username === "ryan"){
        await req.session.save({username:req.form.username}, {generateID:true,maxAge:10});
        const length = await req.session.getSize();
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
server.listen(4433);

// const auth = new SimpleAuthorizerImpl();
// console.log(auth.addId());
const wsServer = new WebSocketServer({
    port:8081, 
    key:readFileSync("./private/localhost.key"), 
    cert:readFileSync("./private/localhost.crt"),
});

wsServer.on("listening", () => {
    console.log("[INFO] Websocket server is listening");
});
wsServer.on("session", (ws:WebSocket) => {
    console.log("new web socket session, remain sessions:", wsServer.sessions.size);
    ws.send("hello");
    ws.on("message", ({data, type, isFinished}:WebSocketMessage) => {
        console.log("type:"+type, "isFinished:", isFinished);
        // console.log("message:", data.toString("utf-8"));
        if(data.toString() === "!close"){
            ws.close(1000, "s");
        }
        //broadcasting
        wsServer.sessions.forEach((websocket) => {
            if(ws === websocket){
                return;
            }
            if(type === "TEXT"){
                websocket.send(data.toString());
            }else if(type === "BINARY"){
                websocket.send(data);
            }
        })
    });
    ws.on("close", (code, reason) => {
        console.log("ws closed", "code:"+code , "reason:"+reason," remain sessions:", wsServer.sessions.size);
    });
    ws.on("error", (err) => {
        console.log(err);
    });
});
