
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

let pattern = "----b";
let strList = ["abc","a--", "-","-babc"];

export function testKMP(){
    indexOf(pattern, strList);

}

export default getNext;

export function indexOf(pattern:string|Buffer, list:string[]|Buffer[]){

    let startList = -1;
    let startIndex = -1;
    let endList = -1;
    let endIndex = -1;
    const next = getNext(pattern);
    let j = 0;

    for(let n = 0; n < list.length; n++){

        const str = list[n];
        let i = 0;

        while(i < str.length && j < pattern.length){

           
            if(j === -1 || str[i] === pattern[j]){

                if(str[i] === pattern[j] && startList === -1 && startIndex === -1){
                    startList = n;
                    startIndex = i;
                    console.log("start");
                }

                i++;
                j++;
            }else{
                j = next[j];

                startList = -1;
                startIndex = -1;
            }

        }

        console.log(i, j);

        if(j == -1){
            j = 0;
        }else if(j === pattern.length){
            endList = n;
            endIndex = i;
            break;
        }

    }

    console.log("startList:"+startList, "startIndex:"+startIndex, "endList:"+endList, "endIndex:"+endIndex);

    // console.log(list[startList].slice(startIndex)+list[endList].slice(0, endIndex));

    return {startList, startIndex, endList, endIndex};
}


function sliceMultiple(stringList:string[], startList:number, startIndex:number, endList:number, endIndex:number){



}