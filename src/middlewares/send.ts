import { Context, Next } from "../types";

function send(){

    const run = ({res}:Context, next:Next) => {

        const send = (data:string|number|boolean|object, statusCode:number = 200, addictiveHeaders?:{[k:string]:string|number}) => {
            const dataType = typeof data;
            const headers:{[k:string]:string|number} = {};
            
            let chunk:Buffer|null = null;

            switch(dataType){
                case "string":
                case "number":
                case "boolean":
                    headers["Content-Type"] = "text/plain";
                    chunk = Buffer.from(String(data));
                    break;
                case "object":
                    headers["Content-Type"] = "application/json";
                    chunk = Buffer.from(JSON.stringify(data));
                    break;
                default:
                    throw TypeError("type of data must be one of string, number, boolean or object");
            }

            headers["Content-Length"] = chunk.length;
            res.writeHead(statusCode, Object.assign(headers, addictiveHeaders));
            res.end(chunk);
        }
        
        res.send = send;
        next();

    }

    return run;
}

export default send;