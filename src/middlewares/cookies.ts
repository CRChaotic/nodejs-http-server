import { Context, Middleware } from "../types";

function cookies(){

    const run:Middleware<Context> = ({req}, next) => {

        const cookie = req.headers.cookie;
        req.cookies = {};

        if(cookie){
            cookie.split("; ")
            .forEach((pair) => {
                const [key, value] = pair.split("=");
                req.cookies[key] = value;
            });
        }

        next();
    };

    return run;
}

export default cookies;