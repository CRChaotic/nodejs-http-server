export type Field = {
    headers:{[k:string]:string};
    value:Buffer;
}

type Part = "headerKey"|"headerValue"|"data"|"end";

const LINE_BREAK = "\r\n";

export default function parseMultiPart(body:Buffer, rawBoundary:string){

    let currentPart:Part = "headerKey";

    const startBoundary = "--"+rawBoundary + LINE_BREAK;
    const boundary = LINE_BREAK + "--" + rawBoundary;

    let cursor = body.indexOf(startBoundary);

    if(cursor === -1){
        console.log("multipart disposed");
        currentPart = "end";
    }

    cursor += startBoundary.length;

    // console.log({body});

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
            let headerValueEnd = body.indexOf(LINE_BREAK, headerValueStart);

            if(headerValueEnd === -1){
                currentPart = "end";
            }else{
                //move cursor to next line
                cursor = headerValueEnd + LINE_BREAK.length;
                // console.log({value:body.subarray(headerValueStart, headerValueEnd).toString()});
                headerValues.push([headerValueStart, headerValueEnd]);

                let charsBehindHeaderValue = "";
                for(let i = 0; i < LINE_BREAK.length; i++){
                    charsBehindHeaderValue += String.fromCharCode(body[cursor+i]);
                }

                if(charsBehindHeaderValue === LINE_BREAK){
                    cursor += LINE_BREAK.length;
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
                }else if(charsBehindBoundary.slice(0, LINE_BREAK.length) === LINE_BREAK){
                    cursor += LINE_BREAK.length;
                    currentPart = "headerKey";
                }
            }
        }

    }

    console.log("time:"+(performance.now() - pStart));

    // console.log(fields);

    return fields;
}