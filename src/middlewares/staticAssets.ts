import { existsSync } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Context } from "../Context";
import { Middleware } from "../Middleware";
import { Next } from "../Next";

export type StaticAssetsOptions = {
    root:string;
    index?:string;
    maxAge?:number;
}

//max age 10 for testing
function staticAssets({
    root, 
    index = "index.html", 
    maxAge = 10,
    
}:StaticAssetsOptions):Middleware<Context>{

    const handle = async ({request:req, response:res}:Context, next:Next) => {

        const url = new URL(req.url!, `http://${req.headers.host}`);
        const filename = url.pathname === "/" ? index:url.pathname;
        const filepath = path.resolve(path.join(root, filename));

        if(req.method === "GET" && existsSync(filepath)){

            const { mtime } = await stat(filepath);
            res.setHeader("cache-control", `max-age=${maxAge}`);

            if(
                req.headers["if-modified-since"] && 
                mtime.toUTCString() === req.headers["if-modified-since"] &&
                !req.headers["cache-control"]
            ){
                res.statusCode = 304;
                res.end();
                return;
            }

            res.sendFile(filepath);

        }else{
            next();
        }
    }

    return { handle };
}

export default staticAssets;