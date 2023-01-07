import { Server, Socket } from "net";
import { IncomingMessage } from "http";
import EventEmitter from "events";
import WebSocket from "./WebSocket";
import { createServer } from "https";
import { Authorizer } from "./Authorizer";

export type WebSocketServerOptions = {
    port:number;
    key:Buffer;
    cert:Buffer;
    path?:string;
    authorizer?:Authorizer;
};

class WebSocketServer extends EventEmitter{

    sessions:Set<WebSocket>;
    #server:Server;
    path:string;
    authorizer:WebSocketServerOptions["authorizer"];

    constructor({port, key, cert, path = "/", authorizer}:WebSocketServerOptions){
        super();
        this.sessions = new Set();
        this.path = path;
        this.authorizer = authorizer;
        this.#server = createServer({key, cert});
        this.#server.listen(port);
        this.#server.addListener("error", (err) => this.emit("error", err));
        this.#server.addListener("listening", () => this.emit("listening"));
        this.#server.addListener("upgrade", this.#handleUpdrade.bind(this));
    }

    #handleUpdrade(req:IncomingMessage, socket:Socket){

        const url = new URL(`https://localhost${req.url}`);
        const websocketKey = req.headers["sec-websocket-key"];

        if(url.pathname !== this.path || req.headers["upgrade"] !== "websocket" || websocketKey == null){
            socket.write("HTTP/1.1 400 Bad Request");
            socket.destroy();
            return;
        }

        if(this.authorizer && !this.authorizer.authenticate(req)){
            socket.write(
                "HTTP/1.1 401 Unauthorized\r\n"+
                "\r\n"
            );
            socket.destroy();
            return;
        }

        const webSocket = new WebSocket(websocketKey, socket);
        webSocket.once("handshake", () => {
            this.sessions.add(webSocket);
            this.emit("session", webSocket);
        });

        webSocket.on("close", () => this.sessions.delete(webSocket));
    }

}

export default WebSocketServer;