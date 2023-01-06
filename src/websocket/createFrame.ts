import OpCode from "./utils/OpCode";

function createFrame({data, type = "text"}:{data?:Buffer, type:"text"|"binary"|"close"|"pong"|"ping"}):Buffer{

    let bodySize = 0;
    if(data){
        bodySize = data.byteLength;
    }
    let payloadLength = 0;
    const isFinished = true;
    let headerSize = 2;
    let offset = 0;

    if(bodySize > 65535){
        payloadLength = 127;
        headerSize += 8;
    }else if(bodySize > 125){
        payloadLength = 126;
        headerSize += 2;
    }else{
        payloadLength = bodySize;
    }

    const frame:Buffer = Buffer.alloc(headerSize + bodySize);
    if(isFinished){
        frame[offset] |= 0b10000000;
    }
    switch(type){
        case "text":
            frame[0] = frame[0] | OpCode.TEXT;
            break;
        case "binary":
            frame[0] = frame[0] | OpCode.BINARY;
            break;
        case "close":
            frame[0] = frame[0] | OpCode.CLOSE;
            break;
        case "ping":
            frame[0] = frame[0] | OpCode.PING;
            break;
        case "pong":
            frame[0] = frame[0] | OpCode.PONG;
            break;
        default:
            throw new Error("type `" + type + "` is not supported");
    }
    offset += 1;

    frame[offset] = frame[offset] | payloadLength;
    offset += 1;

    if(payloadLength === 127){
        frame.writeBigUint64BE(BigInt(bodySize), offset);
        offset += 8;
    }else if(payloadLength === 126){
        frame.writeUInt16BE(bodySize, offset);
        offset += 2;
    }

    data?.forEach((value:number, index:number) => {
        frame[offset + index] = value;
    });

    return frame;
}

export default createFrame;