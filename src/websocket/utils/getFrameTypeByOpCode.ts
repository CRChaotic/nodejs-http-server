import OpCode from "./OpCode";
import FrameType from "./FrameType";

function getFrameTypeByOpCode(opCode:number):FrameType{
    let type:FrameType = "UNKNOWN";
    switch(opCode){
        case OpCode.TEXT:
            type = "TEXT";
            break;
        case OpCode.BINARY:
            type = "BINARY";
            break;
        case OpCode.CONTINUATION:
            type = "CONTINUATION";
            break;
        case OpCode.CLOSE:
            type = "CLOSE";
            break;
        case OpCode.PING:
            type = "PING";
            break;
        case OpCode.PONG:
            type = "PONG";
            break;
    }

    return type;
}

export default getFrameTypeByOpCode;