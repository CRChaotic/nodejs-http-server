import EventEmitter from "events";
import { Socket } from "net";
import createFrame from "./utils/createFrame";
import { ExtendedPayloadLength } from "./utils/ExtendedPayloadLength";
import isControlFrame from "./utils/isControlFrame";
import OpCode from "./utils/OpCode";
import parseFinAndOpCode from "./utils/parseFinAndOpCode";
import parseMaskAndPayloadLength from "./utils/parseMaskAnyPayloadLength";

const DEFAULT_MAX_MESSAGE_SIZE = 1024 * 1024;
const DEFAULT_CLOSE_TIMEOUT = 3000;
const MAX_CONTROL_FRAME_PAYLOAD_SIZE = 125;
const CLOSE_FRAME_CODE_SIZE = 2;
const FramePart = Object.freeze({
    FIN_AND_OPCODE:0,
    MASK_AND_PAYLOAD_LENGTH:1,
    EXTENDED_PAYLOAD_LENGTH:2,
    PAYLOAD:3,
    MASKING_KEY:4,
});

export enum ReadyState {
    CONNECTING = 0,
    OPEN = 1,
    CLOSING = 2,
    CLOSED = 3
}

export type WebSocketMessage = {
    data:Buffer;
    opCode:OpCode.TEXT|OpCode.BINARY;
    isFinished:boolean;
}

export type WebSocketOptions = {
    maxMessageSize?:number;
    closeTimeout?:number;
}

declare interface WebSocket {
    on(event: "message", listener: (websocketMessage: WebSocketMessage) => void): this;
    on(event: "close", listener: (code?:number, reason?:string) => void): this;
    on(event: "error", listener:(error:Error) => void): this;
    on(event: "pong", listener:() => void): this;
    on(event: "timeout", listener:() => void): this;
    on(event: string, listener: Function): this;
}

class WebSocket extends EventEmitter{

    #maxMessageSize:number;
    #closeTimeout:number;
    #socket:Socket;
    #readyState:ReadyState = ReadyState.CONNECTING;
    
    #payloadBuffer:number[] = [];
    #extendedPayloadLengthBuffer:number[] = [];
    #maskingKeyBuffer:number[] = [];
    #isFinished:boolean = false;
    #isMasked:boolean = false;
    #opCode:OpCode = OpCode.UNKNOWN;
    #payloadLength:bigint = 0n;
    #payloadCursor:bigint = 0n;
    #extendedPayloadLength:ExtendedPayloadLength = 0;
    #framePart:number = FramePart.FIN_AND_OPCODE;

    constructor(socket:Socket, {maxMessageSize = DEFAULT_MAX_MESSAGE_SIZE, closeTimeout = DEFAULT_CLOSE_TIMEOUT}:WebSocketOptions = {}){
        super();
        this.#socket = socket;

        if(maxMessageSize < MAX_CONTROL_FRAME_PAYLOAD_SIZE){
            throw new Error("Max payload buffer size must be 125 bytes at least for working with control frame properly");
        }

        this.#maxMessageSize = maxMessageSize;
        this.#closeTimeout = closeTimeout;

        socket.on("data", this.#handleData.bind(this));
        socket.on("error", (err) => this.emit("error", err));
        socket.on("close", () => {
            if(this.#readyState !== ReadyState.CLOSED){
                this.emit("close", 1006, "");
            }else if(this.#payloadBuffer.length >= 2){
                this.emit("close", Buffer.from(this.#payloadBuffer).readUInt16BE(0), Buffer.from(this.#payloadBuffer).toString("utf-8", 2));
            }else{
                this.emit("close", 1005, "");
            }
        });
        socket.on("timeout", () => this.emit("timeout"));

        this.#readyState = ReadyState.OPEN;
        this.emit("open");
    }

    get readyState(){
        return this.#readyState;
    }

    #handleData(data:Buffer){

        let offset = 0;
        let framePart = this.#framePart;
        // console.log("data:",data);

        while(offset < data.byteLength){

            switch(framePart){
                case FramePart.FIN_AND_OPCODE:
                    const {isFinished, opCode} = parseFinAndOpCode(data[offset]);

                    this.#isFinished = isFinished;
                    console.log("isFinished:", isFinished);
                    switch(opCode){
                        case OpCode.UNKNOWN:
                            this.close(1008);
                            return;
                        case OpCode.CLOSE:
                            if(this.#readyState === ReadyState.OPEN){
                                //"recieved close frame"
                                this.#readyState = ReadyState.CLOSING;
                            }else if(this.#readyState === ReadyState.CLOSING){
                                //"recieved close frame response"
                                this.#readyState = ReadyState.CLOSED;
                            }
                        case OpCode.PING:
                        case OpCode.PONG:
                        case OpCode.TEXT:
                        case OpCode.BINARY:
                            this.#opCode = opCode;
                            break;
                        case OpCode.CONTINUATION:
                            break;
                    }

                    framePart = FramePart.MASK_AND_PAYLOAD_LENGTH;
                    offset++;
                    break;
                case FramePart.MASK_AND_PAYLOAD_LENGTH:
                    const {isMasked, payloadLength, extendedPayloadLength} = parseMaskAndPayloadLength(data[offset]);
                    this.#isMasked = isMasked;
                    this.#payloadLength = BigInt(payloadLength);
                    this.#payloadCursor = 0n;
                    this.#extendedPayloadLength = extendedPayloadLength;
                    //send close frame when payload length exceeded max control frame payload size
                    if(isControlFrame(this.#opCode) && this.#payloadLength > MAX_CONTROL_FRAME_PAYLOAD_SIZE){
                        this.close(1009);
                        return;
                    }
     
                    console.log("length of extended payload length:" + extendedPayloadLength);
                    if( this.#extendedPayloadLength > 0){
                        // this.#extendedPayloadLength = extendedPayloadLength;
                        framePart = FramePart.EXTENDED_PAYLOAD_LENGTH;
                    }else if(this.#isMasked){
                        framePart = FramePart.MASKING_KEY;
                    }else{
                        framePart = FramePart.PAYLOAD;
                        //process 0 length payload or control frame
                        if(this.#payloadLength === 0n){
                            continue;
                        }
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
                    }

                    offset++;
                    break;
                case FramePart.MASKING_KEY:
                    if(this.#maskingKeyBuffer.length < 4){
                        this.#maskingKeyBuffer.push(data[offset]);
                    }
                    
                    if(this.#maskingKeyBuffer.length === 4){
                        framePart = FramePart.PAYLOAD;
                        console.log("maskingKey:", Buffer.from(this.#maskingKeyBuffer));
                        //process 0 length payload or control frame
                        if(this.#payloadLength === 0n){
                            continue;
                        }
                    }

                    offset++;
                    break;
                case FramePart.PAYLOAD:
                    //keep buffering when payload is not enough
                    if(this.#payloadCursor < this.#payloadLength){
                        let byte:number;
                        //unmask payload
                        if(this.#isMasked){
                            byte = data[offset] ^ this.#maskingKeyBuffer[Number(this.#payloadCursor % 4n)];
                        }else{
                            byte = data[offset];
                        }

                        this.#payloadBuffer.push(byte);
                        this.#payloadCursor++;                       
                    }

                    //payload is enough and a frame is completely proccessed
                    if(this.#payloadCursor === this.#payloadLength){
                        console.log("payloadLength:", this.#payloadLength);
                        this.#maskingKeyBuffer = [];
                        this.#extendedPayloadLengthBuffer = [];

                        if(this.#readyState === ReadyState.CLOSING){//close frame
                            if(this.#payloadBuffer.length >= CLOSE_FRAME_CODE_SIZE){
                                const code = Buffer.from(this.#payloadBuffer).readUInt16BE(0);
                                const reason = Buffer.from(this.#payloadBuffer).toString("utf-8", CLOSE_FRAME_CODE_SIZE);
                                this.close(code, reason);
                                return;
                            }

                            this.close();
                            return;
                        
                        }else if(this.#readyState === ReadyState.CLOSED){//response close frame
                            this.#socket.destroy();
                            return;
                        }else if(this.#opCode === OpCode.PING){//ping frame
                            this.pong(Buffer.from(this.#payloadBuffer));
                            //clear up possible ping garbage payload buffer
                            this.#payloadBuffer = [];
                        }else if(this.#opCode === OpCode.PONG){//pong frame
                            this.emit("pong");
                        }else if(this.#isFinished){//text or binary last frame
                            //TO DO maybe turn text frame payload into text
                            this.emit("message", {
                                data:Buffer.from(this.#payloadBuffer), 
                                opCode:this.#opCode, 
                                isFinished:true
                            });
                            //clear up payload buffer
                            this.#payloadBuffer = [];
                        }

                        framePart = FramePart.FIN_AND_OPCODE;
                        // this.#clearBuffer();

                    }else if(this.#payloadBuffer.length === this.#maxMessageSize){
                        //payload buffer reached max message size 
                        this.emit("message", {
                            data:Buffer.from(this.#payloadBuffer), 
                            opCode:this.#opCode, 
                            isFinished:false
                        });
                        //clear up payload buffer
                        this.#payloadBuffer = [];
                    }

                    offset++;
                    break;
            }

            this.#framePart = framePart;
        }

    }

    send(data:Buffer|string):Promise<void>{
        return new Promise((resolve, reject) => {
            if(this.#readyState !== ReadyState.OPEN){
                reject(new Error("Cannot send data when readyState is not OPEN"));
                return;
            }

            let opCode:OpCode.TEXT|OpCode.BINARY = OpCode.TEXT;
            if(Buffer.isBuffer(data)){
                opCode = OpCode.BINARY;
            }

            const frame = createFrame({data:Buffer.from(data), opCode});
            this.#socket.write(frame, (err) => {
                if(err){
                    reject(err);
                }else{
                    resolve();
                }
            });
        });
    }

    close(code?:number, reason?:string){
        if(this.#readyState !== ReadyState.OPEN && this.#readyState !== ReadyState.CLOSING){
            return;
        }

        const socket = this.#socket;
        let reasonByteLength = 0;
        if(code != null && reason != null){
            reasonByteLength = Buffer.byteLength(reason);
            if(reasonByteLength > MAX_CONTROL_FRAME_PAYLOAD_SIZE - CLOSE_FRAME_CODE_SIZE){
                this.emit("error", new Error(
                    "close websocket fail, "+
                    "length of reason is "+ reasonByteLength +" bytes, "+
                    "it must be less than "+(MAX_CONTROL_FRAME_PAYLOAD_SIZE - CLOSE_FRAME_CODE_SIZE)+" bytes"
                ));
                return;
            }
        }
        const data:Buffer = Buffer.alloc(CLOSE_FRAME_CODE_SIZE + reasonByteLength);

        if(code != null){
            data.writeUInt16BE(code, 0);
        }
        if(reason != null){
            data.write(reason, CLOSE_FRAME_CODE_SIZE);
        }

        const frame = createFrame({data, opCode:OpCode.CLOSE});

        //hasn't recieved close frame from endpoint and send close frame
        //if not receiving close frame response for a period of time then closing the socket anyway
        if(this.#readyState === ReadyState.OPEN){
            socket.write(frame, (err) => {
                this.#readyState = ReadyState.CLOSING;
                setTimeout(() => {
                    if(this.#readyState !== ReadyState.CLOSED){
                        socket.destroy(err);
                        console.log("timeout close");
                    }else{
                        console.log("has close");
                    }
                }, this.#closeTimeout);
            });
        }else{
        //has recieved close frame from endpoint, sending close frame response and directly closing socket
            socket.write(frame, (err) => {
                this.#readyState = ReadyState.CLOSED;
                socket.destroy(err);
            });
        }
    }

    setTimeout(millieseconds:number){
        this.#socket.setTimeout(millieseconds);
    }

    ping(){
        if(this.#readyState !== ReadyState.OPEN){
            return;
        }

        const frame = createFrame({opCode:OpCode.PING});
        this.#socket.write(frame);
    }

    protected pong(data?:Buffer){
        if(this.#readyState !== ReadyState.OPEN){
            return;
        }

        const frame = createFrame({data, opCode:OpCode.PONG});
        this.#socket.write(frame);
    }
}

export default WebSocket;