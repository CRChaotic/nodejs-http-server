import { existsSync } from "fs";
import path from "path";
import { Context } from "../Context";
import { Middleware } from "../Middleware";
import { Next } from "../Next";

export type StaticAssetsOptions = {
    root:string;
    index?:string;
    cacheControlFilter?:(filepath:string) => string;
}

//max age 10 for test
function staticAssets({
    root, 
    index = "index.html", 
    cacheControlFilter = () => "no-cache"
}:StaticAssetsOptions):Middleware<Context>{

    const handle = ({request:req, response:res}:Context, next:Next) => {

        const url = new URL(req.url!, `http://${req.headers.host}`);
        const filename = url.pathname === "/" ? index:url.pathname;
        const filepath = path.resolve(path.join(root, filename));

        if(req.method === "GET" && existsSync(filepath)){

            res.sendFile(filepath, {
                headers:{
                    "cache-control": cacheControlFilter(filepath)
                }
            });

        }else{
            next();
        }
    }

    return { handle };
}

export default staticAssets;