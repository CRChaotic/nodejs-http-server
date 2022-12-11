import { existsSync } from "fs";
import path from "path";
import { Context, Middleware } from "../types";

//max age 10 for test
function staticAssets(publicDir:string, maxAge = 10, index = "/index.html"){

    const run:Middleware<Context> = async ({req, res}, next) => {

        const url = new URL(req.url!, `http://${req.headers.host}`);
        const basename = url.pathname === "/" ? index:url.pathname;
        const asolutePath = path.join(__dirname, publicDir, basename);

        if(req.method === "GET" && existsSync(asolutePath)){
            res.setHeader("Cache-Control", `max-age=${maxAge}`);
            await res.sendFile(asolutePath);

        }else{
            next();
        }
    }

    return run;
}

export default staticAssets;