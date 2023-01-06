import OpCode from "./OpCode";
import OpCodeType from "./OpCodeType";

function getTypeByOpCode(opCode:number):OpCodeType{
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

    return type;
}

export default getTypeByOpCode;