import { Context, Middleware } from "../types";

function redirect(){

    const run:Middleware<Context> = ({req, res}, next) => {

        res.redirect = (path:string) => {

            switch(req.method){
                case "POST":
                case "PUT":
                case "DELETE":
                    res.statusCode = 303;
                    break;
                case "GET":
                    res.statusCode = 308;
                    break;
                default:
                    throw new Error("only request method is one of POST, PUT, DELETE and GET can be redirected");
            }

            res.setHeader("Location", path);
            res.end();
        };

        next();

    };

    return run;
}

export default redirect;