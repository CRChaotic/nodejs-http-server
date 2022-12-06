import { existsSync } from "fs";
import path from "path";
import { Context, Middleware } from "../types";


function staticAssets(publicDir:string, index = "/index.html"){

    const run:Middleware<Context> = async ({req, res}, next) => {

        const url = new URL(req.url!, `http://${req.headers.host}`);
        //make prefix of path is the same as prefix and path is longer than prefix
        const basename = url.pathname === "/" ? index:url.pathname;
        const asolutePath = path.join(__dirname, publicDir, basename);

        if(req.method === "GET" && existsSync(asolutePath)){
            await res.sendFile(asolutePath);
        }else{
            next();
        }
    }

    return run;
}

export default staticAssets;