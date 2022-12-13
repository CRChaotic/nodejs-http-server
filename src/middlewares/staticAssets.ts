import { existsSync } from "fs";
import path from "path";
import { Context, Middleware } from "../types";

export type StaticAssetsOptions = {
    root?:string,
    maxAge?:number, 
    index?:string
}

//max age 10 for test
function staticAssets({root="public", index = "index.html", maxAge = 10}:StaticAssetsOptions){

    const run:Middleware<Context> = ({req, res}, next) => {

        const url = new URL(req.url!, `http://${req.headers.host}`);
        const filename = url.pathname === "/" ? index:url.pathname;
        const asolutePath = path.resolve(path.join(root, filename));

        if(req.method === "GET" && existsSync(asolutePath)){

            res.sendFile(root, filename, {
                noSniff:false, 
                headers:{
                "cache-control":`max-age=${maxAge}`
            }});

        }else{
            next();
        }
    }

    return run;
}

export default staticAssets;