import { Context } from "../Context";
import { Middleware } from "../Middleware";
import { Next } from "../Next";


function requestCookie():Middleware<Context>{

    const handle = ({request}:Context, next:Next) => {

        const cookies = request.headers.cookie;
        const cookie:{[k:string]:string} = {};

        if(cookies){
            cookies.split("; ")
            .forEach((pair) => {
                const [key, value] = pair.split("=");
                Object.defineProperty(cookie, key, {value, writable:false, enumerable:true});
            });
        }

        Object.defineProperty(request, "cookie", {value:cookie, writable:false, enumerable:true});

        next();
    };

    return { handle };
}

export default requestCookie;