import { Readable, Transform, TransformCallback, TransformOptions } from "stream";

export type Field = {
    headers:{[k:string]:string};
    data:Buffer;
}

type Part = "headerKey"|"headerValue"|"data"|"end";

export class MultipartFormDataParser extends Transform{
    
    currentPart:Part;
    boundary:string;
    rawBoundary:string;
    breakLine:string;
    fields:Field[];
    tmpHeaderValuesIndex:number[][];
    tmpHeaderKeysIndex:number[][];
    chunkCache:Buffer[];

    headerKeyCache:string[];
    headerValueCache:string[];

    constructor(rawBoundary:string, options?:TransformOptions){
        options = Object.assign(options??{}, {readableObjectMode:true});
        super(options); 

        this.currentPart = "headerKey";
        this.rawBoundary = rawBoundary;
        this.boundary = "";
        this.breakLine = "";
        this.tmpHeaderKeysIndex = [];
        this.tmpHeaderValuesIndex = [];
        this.fields = [];
        this.chunkCache = [];

        this.headerKeyCache = [];
        this.headerValueCache = [];
    }

    _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
        
        // console.log({chunk:chunk.toString()});
                    
        if(this.boundary === ""){
            
            const startBoundary= "--"+this.rawBoundary;
            const firstBreakLineChar = String.fromCharCode(chunk[startBoundary.length]);
            const secondBreakLineChar =  String.fromCharCode(chunk[startBoundary.length+1]);
        
            if(firstBreakLineChar === "\n"){
                this.breakLine = "\n";
            }else if(firstBreakLineChar === "\r"){
        
                if(secondBreakLineChar ===  "\n"){
                    this.breakLine = "\r\n";
                }else{
                    this.breakLine = "\r";
                }
            }
        
            if(this.breakLine === ""){
                console.log("multipart disposed");
                this.currentPart = "end";
            }
        
            this.boundary = this.breakLine + startBoundary;
            chunk = chunk.subarray(this.boundary.length);
        }


        while(chunk){

            if(this.currentPart === "headerKey"){
    
                const headerKeyEnd = chunk.indexOf(":");
    
                if(headerKeyEnd === -1){
                    // this.currentPart = "end";
                    this.chunkCache.push(chunk);
                    
                    break;
                }else{

                    this.chunkCache.push(chunk.subarray(0, headerKeyEnd));
                    const key = this.chunkCache.reduce((prev, buffer) => prev+buffer.toString(), "");
                    this.headerKeyCache.push(key);
                    // console.log({key});
                    this.chunkCache = [];
                    //move cursor to colon
                    let offset = headerKeyEnd+1;
                    this.currentPart = "headerValue";
                    
                    // console.log({key:chunk.subarray(headerKeyStart, headerKeyEnd).toString()});    
                 
                    chunk = chunk.subarray(offset);
                }
            }
    
            if(this.currentPart === "headerValue"){
    
                // let headerValueStart = this.cursor;
                const headerValueEnd = chunk.indexOf(this.breakLine);
    
                if(headerValueEnd === -1){
                    // this.currentPart = "end";
                    this.chunkCache.push(chunk);
                    break;
                }else{
                    // console.log(chunk.subarray(headerValueStart, headerValueEnd).toString());

                    this.chunkCache.push(chunk.subarray(0, headerValueEnd));
                    const value =  this.chunkCache.reduce((prev, buffer) => prev+buffer.toString(), "");
                    this.headerValueCache.push(value);
                    this.chunkCache = [];

                    // console.log({value});

                    //move cursor to next line
                    let offset = headerValueEnd +  this.breakLine.length;
                    // console.log({value:chunk.subarray(headerValueStart, headerValueEnd).toString()});
                    let charsBehindHeaderValue = "";
                    for(let i = 0; i <  this.breakLine.length; i++){
                        charsBehindHeaderValue += String.fromCharCode(chunk[offset+i]);
                    }
    
                    if(charsBehindHeaderValue === this.breakLine){
                        offset += this.breakLine.length;
                        this.currentPart = "data";
                    }else{
                        this.currentPart = "headerKey";
                    }

                    chunk = chunk.subarray(offset);
                }
            }
    
            if(this.currentPart === "data"){

                const dataEnd = chunk.indexOf(this.boundary);

                const field:Field = {headers:{}, data:Buffer.from("")};

                for(let i = 0; i < this.headerKeyCache.length; i++){
                    const key = this.headerKeyCache[i];
                    const value = this.headerValueCache[i];
                    field.headers[key] = value;

                    // console.log({key,value});
                }

                if(dataEnd === -1){
                    field.data = chunk;
                    this.push(field);

                    break;
                }else{

                    this.headerKeyCache = [];
                    this.headerValueCache = [];

                    field.data = chunk.subarray(0, dataEnd);
                    this.push(field);
                    //move cursor behind this.boundary
                    let offset = dataEnd + this.boundary.length;
                    // console.log({data:chunk.subarray(dataStart, dataEnd).toString()});
                    // callback(null, field);
    
                    let charsBehindBoundary = "";
                    for(let i = 0; i < 2; i++){
                        charsBehindBoundary += String.fromCharCode(chunk[offset+i]);
                    }
    
                    if(charsBehindBoundary === "--"){
                        offset += 2;
                        this.currentPart = "end";
                        break;
                    }else if(charsBehindBoundary.slice(0, this.breakLine.length) === this.breakLine){
                        offset += this.breakLine.length;
                        this.currentPart = "headerKey";
                    }

                    chunk = chunk.subarray(offset);
                }
            }
        }

        callback();

        // console.log({part:this.currentPart});
    }
}


let boundary = "--974767299852498929531610575"
let testMultipart = `----974767299852498929531610575
Content-Disposition: form-data; name="description"

some text
----974767299852498929531610575
Content-Disposition: form-data; name="myFile"; filename="foo.txt"
Content-Type: text/plain

(content of the uploaded file foo.txt)
----974767299852498929531610575--
`;

export function testMultipartParser(){
    let m = testMultipart.split("e");
    console.log(m);
    let testReadable = new Readable({
        read(size){
            return testMultipart.slice()
        }
    });
}

