

export type Field = {
    headers:{[k:string]:string};
    value:Buffer;
}


export default function parseMultiPart(body:Buffer, rawBoundary:string){

    let currentPart:"headerKey"|"headerValue"|"data"|"end" = "headerKey";

    const startBoundary= "--"+rawBoundary;
    const firstBreakLineChar = String.fromCharCode(body[startBoundary.length]);
    const secondBreakLineChar =  String.fromCharCode(body[startBoundary.length+1]);
    let breakLine = "";

    if(firstBreakLineChar === "\n"){
        breakLine = "\n";
    }else if(firstBreakLineChar === "\r"){

        if(secondBreakLineChar ===  "\n"){
            breakLine = "\r\n";
        }else{
            breakLine = "\r";
        }
    }

    if(breakLine === ""){
        console.log("multipart disposed");
        currentPart = "end";
    }

    const boundary = breakLine + startBoundary;
    let cursor = boundary.length;

    // console.log({body});

    console.log("breaklineLength:"+breakLine.length);


    const fields:Field[] = [];
 
    let headerKeys = [];
    let headerValues = [];

    let pStart = performance.now();

    while(!(currentPart === "end")){

        if(currentPart === "headerKey"){

            let headerKeyStart = cursor;
            let headerKeyEnd = body.indexOf(":", headerKeyStart);

            if(headerKeyEnd === -1){
                currentPart = "end";
            }else{
                //move cursor to colon
                cursor = headerKeyEnd+1;
                currentPart = "headerValue";

                // console.log({key:body.subarray(headerKeyStart, headerKeyEnd).toString()});
                headerKeys.push([headerKeyStart, headerKeyEnd]);
            }
        }

        if(currentPart === "headerValue"){

            let headerValueStart =cursor;
            let headerValueEnd = body.indexOf(breakLine, headerValueStart);

            if(headerValueEnd === -1){
                currentPart = "end";
            }else{
                //move cursor to next line
                cursor = headerValueEnd + breakLine.length;
                // console.log({value:body.subarray(headerValueStart, headerValueEnd).toString()});
                headerValues.push([headerValueStart, headerValueEnd]);

                let charsBehindHeaderValue = "";
                for(let i = 0; i < breakLine.length; i++){
                    charsBehindHeaderValue += String.fromCharCode(body[cursor+i]);
                }

                if(charsBehindHeaderValue === breakLine){
                    cursor += breakLine.length;
                    currentPart = "data";
                }else{
                    currentPart = "headerKey";
                }
            }
        }

        if(currentPart === "data"){

            let dataStart = cursor;
            let dataEnd = body.indexOf(boundary, dataStart);

            if(dataEnd === -1){
                currentPart = "end";
            }else{
                //move cursor behind boundary
                cursor = dataEnd + boundary.length;
                // console.log({data:body.subarray(dataStart, dataEnd).toString()});

                const field:Field = {headers:{}, value:Buffer.from("")};

                for(let i = 0; i < headerKeys.length; i++){
                    const [headerkeyStart, headerKeyEnd] = headerKeys[i];
                    const [headerValueStart, headerValueEnd] = headerValues[i];
                    const key = body.subarray(headerkeyStart, headerKeyEnd).toString();
                    const value = body.subarray(headerValueStart, headerValueEnd).toString();
                    field.headers[key] = value;
                }
                field.value = body.subarray(dataStart, dataEnd);

                fields.push(field);
                //clear up headers when finished a field
                headerKeys = [];
                headerValues = [];

                let charsBehindBoundary = "";
                for(let i = 0; i < 2; i++){
                    charsBehindBoundary += String.fromCharCode(body[cursor+i]);
                }

                if(charsBehindBoundary === "--"){
                    cursor += 2;
                    currentPart = "end";
                }else if(charsBehindBoundary.slice(0, breakLine.length) === breakLine){
                    cursor += breakLine.length;
                    currentPart = "headerKey";
                }
            }
        }

    }

    console.log("time:"+(performance.now() - pStart));

    // console.log(fields);

    return fields;
}


