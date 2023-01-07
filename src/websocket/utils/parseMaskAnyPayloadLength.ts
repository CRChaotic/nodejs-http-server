import { ExtendedPayloadLength } from "./ExtendedPayloadLength";

function parseMaskAndPayloadLength(byte:number){

    const isMasked = (byte & 0b10000000) === 128;
    const payloadLength =  byte & 0b01111111;
    let extendedPayloadLength:ExtendedPayloadLength = 0;

    if(payloadLength === 127){
        extendedPayloadLength = 8;
    }else if(payloadLength === 126){
        extendedPayloadLength = 2;
    }

    return {isMasked, payloadLength, extendedPayloadLength};
}

export default parseMaskAndPayloadLength;