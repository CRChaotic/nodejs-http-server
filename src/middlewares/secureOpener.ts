import { Context, Middleware, Request, Response } from "../types";

type CrossOriginOpenerPolicy = 
|"unsafe-none"
|"same-origin-allow-popups"
|"same-origin";

type SecureOpenerFilter = (request:Request, response:Response) => boolean;

export type SecureOpenerOptions = {
    strategy?:CrossOriginOpenerPolicy;
    filter?:SecureOpenerFilter;
}

const defaultFilter:SecureOpenerFilter = (req, res) => {

    const contentType:any = res.getHeader("content-type");

    if(
        contentType && typeof contentType === "string" &&
        (contentType.includes(("text/html")) || contentType.includes("image/svg+xml"))
    ){
        return true;
    }else{
        return false;
    }
}

function secureOpener({strategy= "same-origin-allow-popups", filter = defaultFilter}:SecureOpenerOptions = {}){

    const decorateSetHeader = (setHeader:Function, req:Request, res:Response) => {
        return function (this:Response, name:string, value: string | number | readonly string[]):Response {

            const newRes = setHeader.apply(this, [name, value]);

            if(filter(req, res)){
                setHeader.apply(this, ["cross-origin-opener-policy", strategy]);
            }

            return newRes;
        }
    }
    
    const run:Middleware<Context> = ({req, res}, next) => {
        if(req.method === "GET"){
            res.setHeader = decorateSetHeader(res.setHeader , req, res);
        }

        next();
    };

    return run;
}

export default secureOpener;