import { Context } from "../Context";
import { Middleware } from "../Middleware";
import { Next } from "../Next";
import { Response } from "../Response";


type Strategy = "sameorigin"|"deny";

function secureFrame(strategy:Strategy = "sameorigin"):Middleware<Context>{

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

    const handle = ({request, response}:Context, next:Next) => {

        if(request.method === "GET"){
            response.setHeader = decorateSetHeader(response.setHeader, response.getHeader);
        }
        
        next();
    };

    return { handle };
}

export default secureFrame;