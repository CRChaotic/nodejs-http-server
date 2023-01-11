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
import WebSocket, { ReadyState, WebSocketMessage } from "./websocket/WebSocket";
import WebSocketServer from "./websocket/WebSocketServer";
import SimpleAuthorizerImpl from "./websocket/SimpleAuthorizerImpl";
import OpCode from "./websocket/utils/OpCode";
import { createServer, IncomingMessage } from "http";

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
}).addRoute("GET", "/ws", (req, res) => {
    res.sendFile("src/views/ws.html");
})


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
    secureContent({
        directives:{
            "frame-ancestors":["'none'"], 
            "connect-src":["https:", "ws:"]
        }
    }),
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

    const request = (req as unknown) as Request;
    const response = (res as unknown) as Response;

    pipeLine.execute({request, response});
})
server.listen(8080);

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

wsServer.on("connection", (ws:WebSocket) => {
    console.log("new websocket connection, remain connections:", wsServer.connections.size);
    // ws.setTimeout(3000);
    ws.send("hello");

    let timer:NodeJS.Timeout;
    let pong = true;
    let autoPing = function () {
        timer = setTimeout(() => {
            if(!pong){
                ws.close();
                clearTimeout(timer);
            }else{
                pong = false;
                ws.ping();
                autoPing();
            }
        }, 5000);
    };
    // autoPing();
    ws.on("pong", () =>{
        pong = true;
        console.log("recieved pong");
    });

    ws.on("timeout", () => {
        ws.close(1000, "timeout");
    });

    ws.on("message", ({data, opCode, isFinished}:WebSocketMessage) => {
        console.log("opCode:"+opCode, "isFinished:", isFinished);
        // console.log("message:", data.toString("utf-8"));
        if(data.toString() === "!close"){
            ws.close(1000, "bye");
        }
        //broadcasting
        wsServer.connections.forEach(async (websocket) => {
            if(ws === websocket || websocket.readyState !== ReadyState.OPEN){
                return;
            }
            if(opCode === OpCode.TEXT){
                try{
                    await websocket.send(data.toString("utf-8"));
                }catch(err){
                    console.log(err);
                }
            }else if(opCode === OpCode.BINARY){
                try{
                    await websocket.send(data);
                }catch(err){
                    console.log(err);
                }
            }
        })
    });
    ws.on("close", (code, reason) => {
        console.log("ws closed", "code:"+code , "reason:"+reason," remain connections:", wsServer.connections.size);
    });
    ws.on("error", (err) => {
        console.log(err);
    });
});

function pushBufferTest(data:Buffer){
    const buffer:number[] = [];

    for(let i = 0; i < data.byteLength; i++){
        buffer.push(data[i]);
    }

    return Buffer.from(buffer);
}

function allocUnsafeBufferTest(data:Buffer, allocUnsafeBuffer:Buffer){
    for(let i = 0; i < data.byteLength; i++){
        allocUnsafeBuffer[i] = data[i];
    }

    return allocUnsafeBuffer;
}

function allocBufferTest(data:Buffer, allocBuffer:Buffer){
    for(let i = 0; i < data.byteLength; i++){
        allocBuffer[i] = data[i];
    }

    return allocBuffer;
}
// const data = Buffer.alloc(1024**2*100, "x");
// const allocUnSafeBuffer = Buffer.allocUnsafe(data.byteLength);
// const allocBuffer = Buffer.alloc(data.byteLength);

// let start = Date.now();
// pushBufferTest(data);
// console.log("pushBufferTest time:", Date.now() - start);

// start = Date.now();
// allocUnsafeBufferTest(data, allocUnSafeBuffer);
// console.log("allocUnsafeBufferTest time:", Date.now() - start);

// start = Date.now();
// allocBufferTest(data, allocBuffer);
// console.log("allocBufferTest time:", Date.now() - start);