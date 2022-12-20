import { Context } from "../Context";
import { Middleware } from "../Middleware";
import { Next } from "../Next";

function redirect():Middleware<Context>{

    const handle = ({request, response}:Context, next:Next) => {

        response.redirect = (path:string, statusCode?:number) => {

            if(statusCode == null){
                response.statusCode = 303;
            }else if(Number.isInteger(statusCode) && statusCode !== 304 && statusCode > 300 && statusCode < 308){
                response.statusCode = statusCode;
            }else{
                next(new Error("redirect status code should be between 301 - 308"));
                return;
            }

            response.setHeader("Location", path);
            response.end();
        };

        next();

    };

    return { handle };
}

export default redirect;