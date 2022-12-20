import { Writable } from "node:stream";
import { Context } from "../Context";
import { Middleware } from "../Middleware";
import { Next } from "../Next";
import parseURLEncodedFormData from "../utils/parseURLEncoded";

const MaxSizeRegExp = /^(?<size>\d+)(?<unit>K|M|G)?$/i;

type ResovleURLEncodedFormDataOptions = {
    maxSize?:number|string;
}

function resolveURLEncodedFormData({maxSize = "10M"}:ResovleURLEncodedFormDataOptions = {}):Middleware<Context>{

    let resolvedMaxSize = 0;

    if(typeof maxSize === "string"){

        const groups = maxSize.match(MaxSizeRegExp)?.groups;

        if(groups && groups.size && groups.unit){

            switch(groups.unit.toUpperCase()){
                case "K":
                    resolvedMaxSize = 1000*Number(groups.size);
                    break;
                case "M":
                    resolvedMaxSize = 1000**2*Number(groups.size);
                    break;
                case "G":
                    resolvedMaxSize = 1000**3*Number(groups.size);
                    break;
                default:
                    throw TypeError("maxSize unit should be one of K, M, G");
            }

        }else{
            throw TypeError("maxSize should be `\\d+(K|M|G)`");
        }

    }else {
        resolvedMaxSize = maxSize;
    }

    const handle = (context:Context, next:Next) => {
        const {request} = context;

        if(request.method === "POST" && request.headers["content-type"] === "application/x-www-form-urlencoded"){

            const body:Buffer[] = [];
            let size = 0;

            const resolver = new Writable({
                write(chunk:Buffer, encoding, callback){
                    size += chunk.length;
                    if(size < resolvedMaxSize){
                        body.push(chunk);
                        callback();
                    }else{
                        callback(new Error("Middleware<resolveURLEncodedFormData> Posted content excesses max size "+resolvedMaxSize+" bytes"))
                    }
                },
                final(callback) {
                    const form = parseURLEncodedFormData(Buffer.concat(body).toString());
                    request.form = form;
                    next();
                    callback();
                },
            });

            request.pipe(resolver);
        }else{
            next();
        }
       
    }

    return { handle };
}

export default resolveURLEncodedFormData;