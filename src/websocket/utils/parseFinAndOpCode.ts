import OpCode from "./OpCode";

function parseFinAndOpCode(byte:number){

    const isFinished = (byte & 0b10000000) === 128;
    const rsv1 = byte & 0b01000000;
    const rsv2 = byte & 0b00100000;
    const rsv3 = byte & 0b00010000;
    const rawOpCode = byte & 0b00001111;
    let opCode:OpCode;

    switch(rawOpCode){
        case OpCode.TEXT:  
        case OpCode.BINARY:
        case OpCode.CONTINUATION:
        case OpCode.CLOSE:
        case OpCode.PING:
        case OpCode.PONG:
            opCode = rawOpCode;
            break;
        default:
            opCode = OpCode.UNKNOWN;
    }

    return Object.freeze({isFinished, rsv1, rsv2, rsv3, opCode});
}

export default parseFinAndOpCode;