import { Writable } from "node:stream";
import { Context, Middleware } from "../types";
import parseURLEncodedFormData from "../utils/parseURLEncoded";

const MaxSizeRegExp = /^(?<size>\d+)(?<unit>K|M|G)?$/i;

function resolveURLEncodedFormData(maxSize:number|string = "10M"){

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

    const run:Middleware<Context> = ({req}, next) => {

        if(req.method === "POST" && req.headers["content-type"] === "application/x-www-form-urlencoded"){

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
                    req.form = form;
                    next();
                    callback();
                },
            });

            req.pipe(resolver);
        }else{
            next();
        }
       
    }

    return run;
}

export default resolveURLEncodedFormData;