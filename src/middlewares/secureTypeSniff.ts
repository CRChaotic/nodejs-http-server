import { Context, Middleware } from "../types";

function secureTypeSniff(){

    const run:Middleware<Context> = ({req, res}, next) => {
        if(req.method === "GET"){
            res.setHeader("X-Content-Type-Options", "nosniff");
        }
        next();
    };

    return run;

}

export default secureTypeSniff;