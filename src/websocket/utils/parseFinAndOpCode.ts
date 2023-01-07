
function parseFinAndOpCode(byte:number){

    const isFinished = (byte & 0b10000000) === 128;
    const rsv1 = byte & 0b01000000;
    const rsv2 = byte & 0b00100000;
    const rsv3 = byte & 0b00010000;
    const opCode = byte & 0b00001111;

    return Object.freeze({isFinished, rsv1, rsv2, rsv3, opCode});
}

export default parseFinAndOpCode;