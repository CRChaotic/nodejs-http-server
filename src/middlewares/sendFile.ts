import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Context, Middleware} from "../types";

export const ContentType = new Map<string, string>();
ContentType.set("html", "text/html; charset=utf-8");
ContentType.set("txt", "text/plain; charset=utf-8");
ContentType.set("css", "text/css");
ContentType.set("js", "text/javascript");

ContentType.set("png", "image/png");
ContentType.set("jpeg", "image/jpeg");
ContentType.set("jpg", "image/jpeg");
ContentType.set("svg", "image/svg+xml");
ContentType.set("webp", "image/webp");
ContentType.set("ico", "image/x-icon");

ContentType.set("mp3", "audio/mpeg");
ContentType.set("mp4", "video/mp4");

ContentType.set("pdf", "application/pdf");
ContentType.set("json", "application/json");

export type SendFileOptions = {
    root:string;
    filename:string;
    type?:string;
    cache?:boolean;
}

function sendFile(){

    const run:Middleware<Context> =  async ({req, res}, next) => {

        const sendFile = async({root, filename, type, cache = false}:SendFileOptions) => {

            try{
                const filepath = path.resolve(path.join(root, filename));
                const { size, mtime } = await stat(filepath);
                const suffix = path.extname(filepath).slice(1);
    
                res.setHeader("Content-Length", size);
                const contentType = type??ContentType.get(suffix)??"application/octet-stream";
                res.setHeader("Content-Type", contentType);
                res.setHeader("Last-Modified", mtime.toUTCString());
    
                if(!res.hasHeader("Cache-Control") && cache){
                    res.setHeader("Cache-Control", `no-cache`);
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