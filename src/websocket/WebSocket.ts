import { createHash } from "crypto";
import EventEmitter from "events";
import { Socket } from "net";
import createFrame from "./utils/createFrame";
import { ExtendedPayloadLength } from "./utils/ExtendedPayloadLength";
import FrameType from "./utils/FrameType";
import getFrameTypeByOpCode from "./utils/getFrameTypeByOpCode";
import parseFinAndOpCode from "./utils/parseFinAndOpCode";
import parseMaskAndPayloadLength from "./utils/parseMaskAnyPayloadLength";

const MAGIC_STRING = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const MAX_PAYLOAD_SIZE = 1024 * 10;
const MAX_PAYLOAD_REASON_SIZE = 123;
const FramePart = Object.freeze({
    FIN_AND_OPCODE:0,
    MASK_AND_PAYLOAD_LENGTH:1,
    EXTENDED_PAYLOAD_LENGTH:2,
    PAYLOAD:3,
    MASKING_KEY:4,
    PAYLOAD_CODE:5,
    PAYLOAD_REASON:6
});

export type WebSocketMessage = {
    data:Buffer;
    type:"TEXT"|"BINARY";
    isFinished:boolean;
}

export type WebSocketOptions = {
    maxPayloadSize?:number;
}

declare interface WebSocket {
    on(event: "message", listener: (websocketMessage: WebSocketMessage) => void): this;
    on(event: "close", listener: (code:number, reason?:string) => void): this;
    on(event: "error", listener:(error:Error) => void): this;
    on(event: string, listener: Function): this;
}

class WebSocket extends EventEmitter{

    maxPayloadSize:number;
    #socket:Socket;
    #readyState:"CONNECTING"|"OPEN"|"CLOSING"|"CLOSED";
      
    #isClosed:boolean;
    #payloadBuffer:number[] = [];
    #extendedPayloadLengthBuffer:number[] = [];
    #maskingKeyBuffer:number[] = [];
    #codeBuffer:number[] = [];
    #reasonBuffer:number[] = [];
    #isFinished:boolean = false;
    #isMasked:boolean = false;
    #frameType:FrameType = "UNKNOWN";
    #payloadLength:bigint = 0n;
    #extendedPayloadLength:ExtendedPayloadLength = 0;
    #framePart:number = FramePart.FIN_AND_OPCODE;
    #payloadCursor:number = 0;

    constructor(webSocketKey:string, socket:Socket, {maxPayloadSize = MAX_PAYLOAD_SIZE}:WebSocketOptions = {}){
        super();
        this.#isClosed = false;
        this.#socket = socket;
        this.#handshake(webSocketKey);
        this.once("handshake", () => {
            this.#readyState = "OPEN";
            socket.on("data", this.#handleData.bind(this));
            socket.on("error", (err) => this.emit("error", err));
            socket.on("close", () => {
                console.log(2);

                if(this.#readyState !== "CLOSED"){
                    this.emit("close", 1006);
                }else if(this.#codeBuffer.length === 2){
                    this.emit("close", Buffer.from(this.#codeBuffer).readUInt16BE(0), Buffer.from(this.#reasonBuffer).toString());
                }else{
                    this.emit("close", 1005);
                }
            });
        });

        this.maxPayloadSize = maxPayloadSize;
        this.#readyState = "CONNECTING";
    }

    #handleData(data:Buffer){

        let offset = 0;
        let framePart = this.#framePart;
        console.log("data:",data);

        while(offset < data.byteLength){

            switch(framePart){
                case FramePart.FIN_AND_OPCODE:
                    const {isFinished, opCode} = parseFinAndOpCode(data[offset]);
                    const frameType = getFrameTypeByOpCode(opCode);

                    this.#isFinished = isFinished;
                    switch(frameType){
                        case "PONG":
                        case "UNKNOWN":
                            this.close(1008);
                            return;
                        case "PING":
                        case "CLOSE":
                            if(this.#readyState === "OPEN"){
                                this.#readyState = "CLOSING";
                            }else if(this.#readyState === "CLOSING"){
                                this.#readyState = "CLOSED";
                            }
                            //TO DO dealing with statusCode and reason
                        case "TEXT":
                        case "BINARY":
                            this.#frameType = frameType;
                            break;
                        case "CONTINUATION":
                            break;
                    }

                    framePart = FramePart.MASK_AND_PAYLOAD_LENGTH;
                    offset++;
                    break;
                case FramePart.MASK_AND_PAYLOAD_LENGTH:
                    const {isMasked, payloadLength, extendedPayloadLength} = parseMaskAndPayloadLength(data[offset]);
                    this.#isMasked = isMasked;
                    this.#payloadLength = BigInt(payloadLength);

                    if(this.#readyState === "CLOSING" && this.#payloadLength > MAX_PAYLOAD_REASON_SIZE){
                        this.close(1009);
                        return;
                    }
     
                    if(extendedPayloadLength > 0){
                        this.#extendedPayloadLength = extendedPayloadLength;
                        framePart = FramePart.EXTENDED_PAYLOAD_LENGTH;
                    }else{
                        if(this.#isMasked){
                            framePart = FramePart.MASKING_KEY;
                        }else{
                            framePart = FramePart.PAYLOAD;
                        }

                        console.log("payloadLength:", this.#payloadLength);
                    }

                    offset++;
                    break;
                case FramePart.EXTENDED_PAYLOAD_LENGTH:
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
                        framePart = this.#isMasked ? FramePart.MASKING_KEY:FramePart.PAYLOAD;

                        console.log("payloadLength:", this.#payloadLength);
                    }

                    offset++;
                    break;
                case FramePart.MASKING_KEY:
                    if(this.#maskingKeyBuffer.length < 4){
                        this.#maskingKeyBuffer.push(data[offset]);
                    }
                    
                    if(this.#maskingKeyBuffer.length === 4){

                        if(this.#readyState === "CLOSING"){

                            if(this.#payloadLength === 0n){
                                this.close();
                                return;
                            }else{
                                framePart = FramePart.PAYLOAD_CODE;
                            }

                        }else{
                            framePart = FramePart.PAYLOAD;
                        }
                        console.log("maskingKey:", Buffer.from(this.#maskingKeyBuffer));
                    }

                    offset++;
                    break;
                case FramePart.PAYLOAD:
                    //keep buffering when payload is not enough
                    if(this.#payloadCursor < this.#payloadLength){
                        let byte:number;

                        //unmask payload
                        if(this.#isMasked){
                            byte = data[offset] ^ this.#maskingKeyBuffer[this.#payloadCursor % 4];
                        }else{
                            byte = data[offset];
                        }

                        this.#payloadBuffer.push(byte);
                        this.#payloadCursor++;                       
                    }

                    //emit event when payload is enough
                    if(BigInt(this.#payloadCursor) === this.#payloadLength){

                        this.emit("message", {
                            data:Buffer.from(this.#payloadBuffer), 
                            type:this.#frameType, 
                            isFinished:this.#isFinished
                        });

                        this.#framePart = FramePart.FIN_AND_OPCODE;
                        this.#resetFrameState();
                    }else if(BigInt(this.#payloadBuffer.length) === BigInt(this.maxPayloadSize)){
                        //payload buffer reach max payload size, need to clear up
                        this.emit("message", {
                            data:Buffer.from(this.#payloadBuffer), 
                            type:this.#frameType,
                            isFinished:false
                        });
                        //emit payload and clear up payload buffer
                        this.#payloadBuffer = [];
                    }

                    offset++;
                    break;
                case FramePart.PAYLOAD_CODE:
                    if(this.#codeBuffer.length < 2){
                        let byte:number;
                        if(this.#isMasked){
                            byte = data[offset] ^ this.#maskingKeyBuffer[this.#payloadCursor % 4];
                        }else{
                            byte = data[offset];
                        }
                        this.#codeBuffer.push(byte);
                        this.#payloadCursor++;
                    }

                    if(this.#codeBuffer.length === 2){
                        if(this.#payloadLength > 2){
                            framePart = FramePart.PAYLOAD_REASON;
                        }else{
                            const code = Buffer.from(this.#codeBuffer).readUInt16BE(0);
                            this.close(code);
                            return;
                        }
                    }

                    offset++;
                    break;
                case FramePart.PAYLOAD_REASON:
                    if(this.#reasonBuffer.length < this.#payloadLength - 2n){
                        let byte:number;
                        if(this.#isMasked){
                            byte = data[offset] ^ this.#maskingKeyBuffer[this.#payloadCursor % 4];
                        }else{
                            byte = data[offset];
                        }
                        this.#reasonBuffer.push(byte);
                        this.#payloadCursor++;
                    }

                    if(BigInt(this.#reasonBuffer.length) === this.#payloadLength - 2n){
                        const code = Buffer.from(this.#codeBuffer).readUInt16BE(0);
                        this.close(code);
                        return;
                    }

                    offset++;
                    break;
            }

            this.#framePart = framePart;
        }

    }

    #resetFrameState(){
        //not reset type so continuation frame can keep origin type
        this.#payloadBuffer = [];
        this.#maskingKeyBuffer = [];
        this.#extendedPayloadLengthBuffer = [];

        this.#payloadCursor = 0;
        this.#payloadLength = 0n;
        this.#extendedPayloadLength = 0;
    }

    #handshake(webSocketKey:string){

        const socket = this.#socket;
        const hasher = createHash("sha1");
        hasher.update(webSocketKey + MAGIC_STRING);
        const websocketAccept = hasher.digest("base64");

        socket.write(
            "HTTP/1.1 101 Switching Protocols\r\n"+
            "connection: upgrade\r\n"+
            "upgrade: websocket\r\n"+
            "sec-websocket-accept: "+ websocketAccept + "\r\n"+
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
        if(this.#readyState !== "OPEN"){
            return;
        }

        const socket = this.#socket;
        let type:"TEXT"|"BINARY" = "TEXT";
        if(Buffer.isBuffer(data)){
            type = "BINARY";
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
    //TO DO
    close(code?:number, reason?:Buffer|string){
        if(this.#readyState !== "OPEN" && this.#readyState !== "CLOSING"){
            return;
        }

        const socket = this.#socket;
        // reason = "";
        // for(let i = 0; i < 124; i++){
        //     reason += "x";
        // }
        // Testing statusCode and reason
        let reasonByteLength = 0;
        if(code != null && reason != null){
            reasonByteLength = Buffer.byteLength(reason);
            if(reasonByteLength > MAX_PAYLOAD_REASON_SIZE){
                this.emit("error", new Error(
                    "length of reason is "+ reasonByteLength +" bytes, "+
                    "it must be less than 123 bytes"
                ));
                return;
            }
        }
        const data:Buffer = Buffer.alloc(2 + reasonByteLength);

        if(code != null){
            data.writeUInt16BE(code, 0);
        }
        if(reason != null){
            data.write(Buffer.isBuffer(reason) ? reason.toString(): reason, 2);
        }

        const frame = createFrame({data, type:"CLOSE"});

        if(this.#readyState === "OPEN"){
            socket.write(frame, (err) => {
                this.#readyState = "CLOSING";

                setTimeout(() => {
                    if(this.#readyState !== "CLOSED"){
                        this.#readyState = "CLOSED";
                        socket.destroy(err);
                        console.log("timeout close");
                    }
                }, 5000);
            });
        }else{
            socket.write(frame, (err) => {
                this.#readyState = "CLOSED";
                socket.destroy(err);
            });
        }
    }

    #pong(){
        if(this.#isClosed){
            return;
        }

        const frame = createFrame({type:"PONG"});
        this.#socket.write(frame);
    }
}

export default WebSocket;