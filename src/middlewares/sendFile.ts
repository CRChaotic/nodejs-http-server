import { stat } from "fs/promises";
import path from "path";
import { MIMEType } from "../MIMEType";
import { Context } from "../Context";
import { Middleware } from "../Middleware";
import { Next } from "../Next";
import { createReadStream } from "fs";

export type SendFileOptions = {
    lastModified?:boolean;
    noSniff?:boolean;
    headers?:{
        [k:string]:string | number | readonly string[];
    };
    statusCode?:number;
}

//TO DO range request
function sendFile(fallbackMIMEType:string = "application/octet-stream"):Middleware<Context>{

    const handle =  async (context:Context, next:Next) => {

        const {response} = context;

        const sendFile = async (
            filepath:string, 
            {
                lastModified = true, 
                noSniff = true,
                headers = {},
            }:SendFileOptions = {}
        ) => {

            try{
                filepath = path.resolve(filepath);
                const stats = await stat(filepath);
                const mtime = stats.mtime;
                const size = stats.size;
                if(!stats.isFile()){
                    next(new Error(filepath + " is not a file"));
                    return;
                }
                const suffix = path.extname(filepath).slice(1);
    
                response.setHeader("content-length", size);
                const contentType = headers["content-type"]??MIMEType.get(suffix)??fallbackMIMEType;
                response.setHeader("content-type", contentType);
    
                for(const [name, value] of Object.entries(headers)){
                    response.setHeader(name, value);
                }

                if(lastModified){
                    response.setHeader("last-modified", mtime.toUTCString());
                }
    
                if(noSniff){
                    response.setHeader("x-content-type-options", "nosniff");
                }
    
                response.statusCode = response.statusCode === 200 ? 200:response.statusCode;
                const data = createReadStream(filepath);
                data.pipe(response);    

            }catch(error){
                next(error);
            }
            
        };

        response.sendFile = sendFile;
        next();
    }

    return { handle };
}

export default sendFile;