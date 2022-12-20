import { Context } from "../Context";
import { Middleware } from "../Middleware";
import { Next } from "../Next";
import { Request } from "../Request";
import { Response } from "../Response";


type CrossOriginOpenerPolicy = 
|"unsafe-none"
|"same-origin-allow-popups"
|"same-origin";

type SecureOpenerFilter = (request:Request, response:Response) => boolean;

export type SecureOpenerOptions = {
    strategy?:CrossOriginOpenerPolicy;
    filter?:SecureOpenerFilter;
}

const defaultFilter:SecureOpenerFilter = (req:Request, res:Response) => {

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

function secureOpener({
    strategy= "same-origin-allow-popups", 
    filter = defaultFilter
}:SecureOpenerOptions = {}):Middleware<Context>{

    const decorateSetHeader = (setHeader:Function, req:Request, res:Response) => {
        return function (this:Response, name:string, value: string | number | readonly string[]):Response {

            const newRes = setHeader.apply(this, [name, value]);

            if(filter(req, res)){
                setHeader.apply(this, ["cross-origin-opener-policy", strategy]);
            }

            return newRes;
        }
    }
    
    const handle = ({request, response}:Context, next:Next) => {
        if(request.method === "GET"){
            response.setHeader = decorateSetHeader(response.setHeader ,request, response);
        }

        next();
    };

    return { handle };
}

export default secureOpener;