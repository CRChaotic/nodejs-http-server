import { Context, Middleware } from "../types";

type SendOptions = {
    statusCode?:number, 
    headers?:{[k:string]:string|number};
}

function send(){

    const run:Middleware<Context> = ({res}, next) => {

        const send = (data:string|number|boolean|object, {statusCode = 200, headers = {}}:SendOptions = {}) => {

            const dataType = typeof data;
            let contentType:string = "";
            let chunk:Buffer|null = null;

            switch(dataType){
                case "string":
                case "number":
                case "boolean":
                    contentType = "text/plain";
                    chunk = Buffer.from(String(data));
                    break;
                case "object":
                    contentType = "application/json";
                    chunk = Buffer.from(JSON.stringify(data));
                    break;
                default:
                    throw TypeError("type of data must be one of string, number, boolean or object");
            }

            for(const [name, value] of Object.entries(headers)){
                res.setHeader(name, value);
            }

            res.statusCode = statusCode;
            res.setHeader("content-type", contentType);
            res.setHeader("content-length", chunk.length);
            res.end(chunk);
    
        }
        
        res.send = send;
        next();

    }

    return run;
}

export default send;