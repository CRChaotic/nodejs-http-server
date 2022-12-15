import { Context, Middleware, Response } from "../types";

type Strategy = "sameorigin"|"deny";

function secureFrame(strategy:Strategy = "sameorigin"){

    const decorateSetHeader = (setHeader:Function, getHeader:Function) => {
        return function (this:Response, name:string, value: string | number | readonly string[]):Response {
            const newRes:Response = setHeader.apply(this, [name, value]);

            const type:string|null = getHeader.apply(this, ["content-type"]);
            if(type && (type.includes("text/html") || type.includes("image/svg+xml"))){
                setHeader.apply(this, ["x-frame-options", strategy]);
            }

            return newRes;
        }
    };

    const run:Middleware<Context> = ({req, res}, next) => {

        if(req.method === "GET"){
            res.setHeader = decorateSetHeader(res.setHeader, res.getHeader);
        }
        
        next();
    };

    return run;
}

export default secureFrame;