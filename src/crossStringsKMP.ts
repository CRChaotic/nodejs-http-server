
function getNext(pattern:string|Buffer){

    let i = 1;
    let j = 0;
    const next = [-1];

    while(i < pattern.length){

        if(pattern[i] == pattern[j]){
            next.push(next[j]);
        }else{
            next.push(j);

            while(j !== -1 && pattern[i] !== pattern[j]){
                j = next[j];
            }
        }

        i++;
        j++;
    }

    return next;
}


let pattern = "--b";
const LF = 10;
const CR = 13;
const LINE_BREAK = Buffer.from("\r\n");
const COLON = Buffer.from(":");

let chunk = Buffer.from(
    "--b\r\n"+
    "Content-Type: name=x; filename=y\r\n"+
    "\r\n"+
    "--b--"
    );

export function testKMP(){

    const rawBoundary = "b";
    const startBoundary = "--"+rawBoundary+"\r\n";
    let cursor = 0;

    const result1 = indexOf(Buffer.from(startBoundary), chunk);
    console.log(chunk.subarray(result1.index, result1.hasMatched).toString());
    cursor = result1.index + startBoundary.length;
    chunk = chunk.subarray(cursor);

    const result2 = indexOf(COLON, chunk, (byte) => byte !== CR);

    console.log(chunk.subarray(0, result2.index).toString());

    console.log(result1, result2);
}

export default getNext;

type Condition = (oneOfChunk:number|string) => boolean;

function indexOf<T extends Buffer | string>(pattern:T, chunk:T, condition?:Condition){

    let i = 0;
    let j = 0;
    const next = getNext(pattern);

    while(j < pattern.length && i < chunk.length){
        
        if(condition && !condition(chunk[i])){
            j = 0;
            break;
        }
        
        if(j === -1 || pattern[j] === chunk[i]){
            i++;
            j++;
        }else{
            j = next[j];
        }

    }

    let index = -1;
    if(j === pattern.length){
        index = i - pattern.length;
    }

    console.log(j, i);

    return {index, hasMatched:j};
}

// export function indexOf(pattern:string|Buffer, list:string[]|Buffer[]){

//     let startList = -1;
//     let startIndex = -1;
//     let endList = -1;
//     let endIndex = -1;
//     let next = null;
//     if(Buffer.isBuffer(pattern)){
//         next = getNext(Buffer.from(pattern));
//     }else{
//         next = getNext(pattern);
//     }
    
//     let j = 0;

//     for(let n = 0; n < list.length; n++){

//         const str = list[n];
//         let i = 0;

//         while(i < str.length && j < pattern.length){

           
//             if(j === -1 || str[i] === pattern[j]){

//                 if(str[i] === pattern[j] && startList === -1 && startIndex === -1){
//                     startList = n;
//                     startIndex = i;
//                     console.log("start");
//                 }

//                 i++;
//                 j++;
//             }else{
//                 j = next[j];

//                 startList = -1;
//                 startIndex = -1;
//             }

//         }

//         console.log(i, j);

//         if(j == -1){
//             j = 0;
//         }else if(j === pattern.length){
//             endList = n;
//             endIndex = i;
//             break;
//         }

//     }

//     console.log("startList:"+startList, "startIndex:"+startIndex, "endList:"+endList, "endIndex:"+endIndex);

//     // console.log(list[startList].slice(startIndex), list[endList].slice(0, endIndex));

//     return {startList, startIndex, endList, endIndex};
// }
