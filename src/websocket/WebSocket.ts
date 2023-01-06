import { createHash } from "crypto";
import EventEmitter from "events";
import { Socket } from "net";
import createFrame from "./createFrame";
import OpCodeType from "./utils/OpCodeType";
import parseFinAndOpCode from "./utils/parseFinAndOpCode";
import parseMaskAndPayloadLength from "./utils/parseMaskAnyPayloadLength";

const MAGIC_STRING = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

export type WebSocketMessage = {
    data:Buffer;
    length:bigint;
    type:"text"|"binary";
    isFinished:boolean;
}

export type WebSocketOptions = {
    maxPayloadSize?:bigint|number;
}

declare interface WebSocket {
    on(event: "message", listener: (websocketMessage: WebSocketMessage) => void): this;
    on(event: "close", listener: () => void): this;
    on(event: "error", listener:(error:Error) => void): this;
    on(event: string, listener: Function): this;
}

class WebSocket extends EventEmitter{

    #isClosed:boolean;
    #socket:Socket;

    #payloadBuffer:number[] = [];
    #extendedPayloadLengthBuffer:number[] = [];
    #maskingKeyBuffer:number[] = [];
    #isMasked:boolean = false;
    #type:OpCodeType = "unknown";
    #payloadLength:bigint = 0n;
    #extendedPayloadLength:0|2|8 = 0;
    #isFinished:boolean = false;
    #framePart:string = "finAndOpCode";
    #payloadCursor:bigint = 0n;
    maxPayloadSize:bigint|number;

    constructor(webSocketKey:string, socket:Socket, {maxPayloadSize = 1024*10}:WebSocketOptions = {}){
        super();
        this.#isClosed = false;
        this.#socket = socket;
        this.#handshake(webSocketKey);
        this.on("handshake", () => {
            socket.on("data", this.#handleData3.bind(this));
            socket.on("error", (err) => this.emit("error", err));
            socket.on("close", (hadError) => this.emit("close", hadError));
        });

        this.maxPayloadSize = maxPayloadSize;
    }

    // #handleData(data:Buffer){
    //     const socket = this.#socket;
    //     const frame = parseFrame(data);
        
    //     switch(frame.opcode){
    //         case OpCode.TEXT:
    //             this.emit("message", {data:frame.payload, length:frame.payloadLength, type:"text"});
    //             break;
    //         case OpCode.BINARY:
    //             this.emit("message", {data:frame.payload, length:frame.payloadLength, type:"binary"});
    //             break;
    //         case OpCode.CLOSE:
    //             if(!this.#isClosed){
    //                 this.close();
    //             }
    //             break;
    //         case OpCode.PING:
    //             socket.write(createFrame({type:"pong"}));
    //             break;
    //     }
    // }


    #handleData3(data:Buffer){

        let offset = 0;
        let framePart = this.#framePart;

        while(offset < data.byteLength){
            switch(framePart){
                case "finAndOpCode":
                    const {isFinished, type} = parseFinAndOpCode(data[offset]);
                    if(type === "unknown"){
                        this.#resetFrameState();
                        return;
                    }

                    this.#isFinished = isFinished;
                    if(type === "close"){
                        this.close();
                        return;
                    }else if(type === "ping"){
                        this.emit("ping");
                    }else if(type !== "continuation"){
                        this.#type = type;
                    }

                    framePart = "maskAndPayloadLength";
                    offset++;
                    break;
                case "maskAndPayloadLength":
                    const {isMasked, payloadLength, extendedPayloadLength} = parseMaskAndPayloadLength(data[offset]);
                    this.#isMasked = isMasked;
                    this.#payloadLength = BigInt(payloadLength);

                    if(extendedPayloadLength > 0){
                        this.#extendedPayloadLength = extendedPayloadLength;
                        framePart = "extendedPayloadLength";
                    }else{
                        if(this.#isMasked){
                            framePart = "maskingKey";
                        }else{
                            framePart = "payload";
                        }

                        console.log("payloadLength:", this.#payloadLength);
                    }

                    offset++;
                    break;
                case "extendedPayloadLength":
                    if(this.#extendedPayloadLengthBuffer.length < this.#extendedPayloadLength){ 
                        this.#extendedPayloadLengthBuffer.push(data[offset]);
                    }
                    
                    if(this.#extendedPayloadLengthBuffer.length === this.#extendedPayloadLength){
                        if(this.#extendedPayloadLengthBuffer.length === 2){
                            this.#payloadLength = BigInt(Buffer.from(this.#extendedPayloadLengthBuffer).readUInt16BE(0));
                        }else {
                            //length of extendedPayloadLengthBuffer is 8
                            this.#payloadLength = Buffer.from(this.#extendedPayloadLengthBuffer).readBigUInt64BE(0);
                        }
                        framePart = this.#isMasked ? "maskingKey":"payload";

                        console.log("payloadLength:", this.#payloadLength);
                    }

                    offset++;
                    break;
                case "maskingKey":
                    if(this.#isMasked && this.#maskingKeyBuffer.length < 4){
                        this.#maskingKeyBuffer.push(data[offset]);
                    }
                    
                    if(this.#isMasked && this.#maskingKeyBuffer.length === 4){
                        console.log("maskingKey:", Buffer.from(this.#maskingKeyBuffer));
                        framePart = "payload";
                    }

                    offset++;
                    break;
                case "payload":
                    //keep buffering when payload is not enough
                    if(this.#payloadCursor < this.#payloadLength){
                        let byte:number;

                        //unmask payload
                        if(this.#isMasked && this.#maskingKeyBuffer.length === 4){
                            byte = data[offset] ^ this.#maskingKeyBuffer[Number(this.#payloadCursor % 4n)];
                        }else{
                            byte = data[offset];
                        }

                        this.#payloadBuffer.push(byte);
                        this.#payloadCursor++;                       
                    }

                    //emit event when payload is enough
                    if(this.#payloadCursor === this.#payloadLength){

                        framePart = "finAndOpCode";
                        this.emit("message", {
                            data:Buffer.from(this.#payloadBuffer), 
                            type:this.#type, 
                            isFinished:this.#isFinished
                        });

                        this.#resetFrameState();
                    }else if(BigInt(this.#payloadBuffer.length) === BigInt(this.maxPayloadSize)){
                        //payload buffer reach max payload size, need to clear up
                        this.emit("message", {
                            data:Buffer.from(this.#payloadBuffer), 
                            type:this.#type, 
                            isFinished:false
                        });
                        //emit payload and clear up payload buffer
                        this.#payloadBuffer = [];
                    }

                    offset++;
                    break;
            }

            this.#framePart = framePart;
        }

    }

    #resetFrameState(){
        //not reset type so continuation frame can keep origin type
        this.#framePart = "finAndOpCode";
        this.#payloadBuffer = [];
        this.#maskingKeyBuffer = [];
        this.#isMasked = false;
        this.#isFinished = false;
        this.#payloadCursor = 0n;
        this.#payloadLength = 0n;
        this.#extendedPayloadLength = 0;
        this.#extendedPayloadLengthBuffer = [];
    }

    #handshake(webSocketKey:string){
        const socket = this.#socket;
        // console.log("webSocketkey:" + webSocketKey);

        const hasher = createHash("sha1");
        hasher.update(webSocketKey + MAGIC_STRING);
        const websocketAccept = hasher.digest("base64");

        // console.log("websocket-accept:"+websocketAccept);
        socket.write(
            "HTTP/1.1 101 Switching Protocols\r\n"+
            "connection: upgrade\r\n"+
            "upgrade: websocket\r\n"+
            "sec-websocket-accept: "+websocketAccept + "\r\n"+
            "\r\n"
        , (err) => {
            if(err){
                this.emit("error", err);
                return;
            }

            this.emit("handshake");
        });

    }

    async send(data:Buffer|string):Promise<void>{
        if(this.#isClosed){
            return;
        }

        const socket = this.#socket;
        let type:"text"|"binary" = "text";
        if(Buffer.isBuffer(data)){
            type = "binary";
        }
        const frame = createFrame({data:Buffer.from(data), type});

        let resolve:() => void;
        let reject:(reason?:any) => void;
        const promise = new Promise<void>((res, rej) => {
            resolve = res;
            reject = rej;
        })
        
        socket.write(frame, (err) => {
            if(err){
                reject(err);
                return;
            }

            resolve();
        });

        return promise;
    }

    close(){
        if(this.#isClosed){
            return;
        }
        const socket = this.#socket;
        this.#isClosed = true;

        const frame = createFrame({type:"close"});
        socket.write(frame, (err) => socket.destroy(err));
    }

    #pong(){
        if(this.#isClosed){
            return;
        }

        const frame = createFrame({type:"pong"});
        this.#socket.write(frame);
    }
}

export default WebSocket;