import OpCode from "./utils/OpCode";
import OpCodeType from "./utils/OpCodeType";

function parseFrame(data:Buffer){
    
    const isFinished = (data[0] & 0b10000000) === 128;
    const rsv1 = data[0] & 0b01000000;
    const rsv2 = data[0] & 0b00100000;
    const rsv3 = data[0] & 0b00010000;
    const opcode = data[0] & 0b00001111;
    const mask = data[1] & 0b10000000;
    let payloadLength:bigint = BigInt(data[1] & 0b01111111);
    let offset = 2;
    let maskingKey:Buffer|null = null;
    let payload:Buffer; 

    if(payloadLength === 126n){
        payloadLength = BigInt(data.readUInt16BE(offset));
        offset += 2;
        
    }else if(payloadLength === 127n){
        payloadLength = data.readBigUInt64BE(offset);
        offset += 8;
    }

    if(mask === 128){
        maskingKey = data.subarray(offset, offset+4);
        offset += 4;
    }

    payload = data.subarray(offset);

    if(maskingKey != null){
        for(let i = 0; i < payloadLength; i++){
            payload[i] = payload[i] ^ maskingKey![i % 4];
        }
    }

    return {isFinished, rsv1, rsv2, rsv3, opcode, payloadLength, payload, maskingKey, isMasked: mask === 128};
}

export default parseFrame;

function unmaskPayload(payload:Buffer, payloadOffset:number, maskingKey:Buffer){

    if(maskingKey.byteLength !== 4){
        throw new Error("length of masking key must be 4");
    }

    for(let i = 0; i < payload.byteLength; i++){
        payload[i] = payload[i] ^ maskingKey[payloadOffset % 4];
        payloadOffset++;
    }
    
    return payloadOffset;
}


function parseFinAndOpCode(byte:number){

    const isFinished = (byte & 0b10000000) === 128;
    const rsv1 = byte & 0b01000000;
    const rsv2 = byte & 0b00100000;
    const rsv3 = byte & 0b00010000;
    const opCode = byte & 0b00001111;

    let type:OpCodeType = "unknown";
    switch(opCode){
        case OpCode.TEXT:
            type = "text";
            break;
        case OpCode.BINARY:
            type = "binary";
            break;
        case OpCode.CONTINUATION:
            type = "continuation";
            break;
        case OpCode.CLOSE:
            type = "close";
            break;
        case OpCode.PING:
            type = "ping";
            break;
        case OpCode.PONG:
            type = "pong";
            break;
    }

    return {isFinished, rsv1, rsv2, rsv3, type};
}

function parseMaskAndPayloadLength(byte:number){

    const isMasked = (byte & 0b10000000) === 128;
    const payloadLength =  byte & 0b01111111;
    let extendedPayloadLength:0|2|8 = 0;

    if(payloadLength === 127){
        extendedPayloadLength = 8;
    }else if(payloadLength === 126){
        extendedPayloadLength = 2;
    }

    return {isMasked, payloadLength, extendedPayloadLength};
}

function parseExtendedPayloadLength(buffer:Buffer){

    let extendedPayloadLength:bigint = 0n;
    if(buffer.byteLength === 8){
        extendedPayloadLength = buffer.readBigUInt64BE(8);
    }else if(buffer.byteLength === 2){
        extendedPayloadLength = BigInt(buffer.readUint16BE(2));
    }
    
    return extendedPayloadLength;
}

function parseMaskingKey(buffer:Buffer){

    if(buffer.byteLength !== 4){
        throw new Error("length of buffer must be 4");
    }

    const maskingKey = Buffer.alloc(4);

    buffer.forEach((byte:number, index:number) => {
        maskingKey[index] = byte;
    });

    return maskingKey;
}

export {parseFinAndOpCode, parseMaskAndPayloadLength, parseExtendedPayloadLength, parseMaskingKey, unmaskPayload};