import { Context } from "../Context";
import { Middleware } from "../Middleware";
import { Next } from "../Next";


type SendOptions = {
    statusCode?:number, 
    headers?:{[k:string]:string|number};
}

function send():Middleware<Context>{

    const handle = (context:Context, next:Next) => {
        
        const { response } = context;

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
                    next(new TypeError("type of data must be one of string, number, boolean or object"));
                    return;
            }

            for(const [name, value] of Object.entries(headers)){
                response.setHeader(name, value);
            }

            response.statusCode = statusCode;
            response.setHeader("content-type", contentType);
            response.setHeader("content-length", chunk.length);
            response.end(chunk);
    
        }
        
        response.send = send;
        next();

    }

    return { handle };
}

export default send;