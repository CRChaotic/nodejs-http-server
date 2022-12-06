import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Context, Middleware} from "../types";

export const ContentType = new Map<string, string>();
ContentType.set("html", "text/html; charset=utf-8;");
ContentType.set("txt", "text/plain; charset=utf-8;");
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

function sendFile(){

    const run:Middleware<Context> =  async ({res}, next) => {

        const sendFile = async(filepath:string, type?:string) => {

            const { size } = await stat(filepath);
            const data = createReadStream(filepath);
            data.on("error", (err) => {
                console.log("[ERROR] Middleware<sendFile> "+err.message);
            });
            const suffix = path.extname(filepath).slice(1);

            res.statusCode = 200;
            res.setHeader("Content-Length", size);
            const contentType = type??ContentType.get(suffix)??"application/octet-stream";
            res.setHeader("Content-Type", contentType);

            data.pipe(res);
        };

        res.sendFile = sendFile;
        next();
    }

    return run;
}

export default sendFile;