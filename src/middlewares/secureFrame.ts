import { Context, Middleware, Response } from "../types";

function secureFrame(){

    const wrappedSetHeader = (setHeader:Function, getHeader:Function) => {
        return function (name:string, value: string | number | readonly string[]):Response {
            const newRes:Response = setHeader.apply(this, [name, value]);

            const type:string|null = getHeader.apply(this, ["Content-Type"]);
            if(type && type.includes("text/html")){
                setHeader.apply(this, ["X-Frame-Options", "SAMEORIGIN"]);
            }

            return newRes;
        }
    };

    const run:Middleware<Context> = ({req, res}, next) => {

        if(req.method === "GET"){
            res.setHeader = wrappedSetHeader(res.setHeader, res.getHeader);
        }
        
        next();
    };

    return run;
}

export default secureFrame;