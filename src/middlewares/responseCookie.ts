import { Context } from "../Context";
import { Middleware } from "../Middleware";
import { Next } from "../Next";

export type SetCookieOptions = {
    path?:string;
    sameSite?:"strict"|"lax"|"none";
    domain?:string;
    maxAge?:number;
    secure?:boolean;
    httpOnly?:boolean;
}


const defaultOptions:SetCookieOptions = {
    path:"/",
    sameSite:"lax",
    secure:true,
    httpOnly:true
};

function responseCookie():Middleware<Context>{

    const handle = ({response}:Context, next:Next) => {

        const setCookie = (name:string, value:number|string|object, {
            path="/",
            sameSite="lax",
            secure=true,
            httpOnly=true,
            maxAge,
            domain,
        }:SetCookieOptions = defaultOptions) => {

            const lastCookies = response.getHeader("set-cookie");
            const cookies:string[] = [];
            if(Array.isArray(lastCookies)){
                lastCookies.forEach((cookie) => cookies.push(cookie));
            }else if(typeof lastCookies === "number" || typeof lastCookies === "string"){
                cookies.push(String(lastCookies));
            }

            if(typeof value === "object"){
                value = JSON.stringify(value);
            }else if(typeof value === "number"){
                value = String(value);
            }
            value = encodeURIComponent(value);
            let cookie = `${name}=${value}`;
            if(path && path.trim().length > 0){
                cookie += `; path=${path.trim()}`;
            }
            if(sameSite && sameSite.trim().length > 0){
                cookie += `; samesite=${sameSite.trim()}`;
            }
            if(domain && domain.trim().length > 0){
                cookie += `; domain=${domain.trim()}`;
            }
            if(maxAge){
                cookie += `; max-age=${maxAge}`;
            }
            if(secure){
                cookie += `; secure`;
            }
            if(httpOnly){
                cookie += `; httponly`;
            }

            cookies.push(cookie);

            response.setHeader("set-cookie", cookies);
        };

        response.setCookie = setCookie;
        next();
    };

    return { handle };
}

export default responseCookie;