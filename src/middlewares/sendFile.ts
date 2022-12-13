import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { ContentType } from "../ContentType";
import { Context, Middleware} from "../types";

export type SendFileOptions = {
    lastModified?:boolean;
    noSniff?:boolean;
    headers?:{
        [k:string]:string | number | readonly string[];
    };
}

function sendFile(fallbackContentType:string = "application/octet-stream"){

    const run:Middleware<Context> =  async ({req, res}, next) => {

        const sendFile = async (
            root:string, 
            filename:string, 
            {
                lastModified = true, 
                noSniff = true, 
                headers = {}
            }:SendFileOptions = {}
        ) => {

            try{
                const filepath = path.resolve(path.join(root, filename));
                const { size, mtime } = await stat(filepath);
                const suffix = path.extname(filepath).slice(1);
    
                for(const [name, value] of Object.entries(headers)){
                    res.setHeader(name, value);
                }

                res.setHeader("content-length", size);
                const contentType = headers["content-type"]??ContentType.get(suffix)??fallbackContentType;
                res.setHeader("content-type", contentType);

                if(lastModified){
                    res.setHeader("last-modified", mtime.toUTCString());
                }

                if(noSniff){
                    res.setHeader("x-content-type-options", "nosniff");
                }
    
                if(req.headers["if-modified-since"] && mtime.toUTCString() === req.headers["if-modified-since"] && !req.headers["cache-control"]){
                    res.statusCode = 304;
                    res.end();
                }else{
                    const data = createReadStream(filepath);
                    res.statusCode = 200;
                    data.pipe(res);
                }

            }catch(err){
                console.error("[ERROR] Middleware<sendFile> "+err.message);
            }
           
        };

        res.sendFile = sendFile;
        next();
    }

    return run;
}

export default sendFile;