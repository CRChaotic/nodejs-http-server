import { Context } from "../Context";
import { Middleware } from "../Middleware";
import { Next } from "../Next";

function redirect():Middleware<Context>{

    const handle = ({response}:Context, next:Next) => {

        response.redirect = (path:string, statusCode:number = 303) => {

            switch(statusCode){
                case 301:
                case 302:
                case 303:
                case 305:
                case 306:
                case 307:
                case 308:
                    response.statusCode = statusCode;
                    break;
                default:
                    next(new Error("redirect status code should be between 301 - 308 and not including 304"));
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