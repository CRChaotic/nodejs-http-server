import OpCode from "./OpCode";

type ControlOpCode =
| OpCode.CLOSE 
| OpCode.PING 
| OpCode.PONG

const CONTROL_FRAME_OPCODE:OpCode[] = [OpCode.CLOSE, OpCode.PING, OpCode.PONG];

function isControlFrame(opCode:OpCode):opCode is ControlOpCode {
    return CONTROL_FRAME_OPCODE.includes(opCode);
}

export default isControlFrame;