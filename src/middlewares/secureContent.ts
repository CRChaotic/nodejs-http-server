import { Context, Middleware, Request, Response } from "../types";

export type ContentSecurityPolicyDirectives = {
    defaultSrc?: string[]
    scriptSrc?: string[];
    styleSrc?: string[]; 
    imgSrc?: string[];
    mediaSrc?: string[];
    fontSrc?: string[];
    frameAncestors?: string[]; 
    frameSrc?: string[];
    formAction?: string[];
    objectSrc?: string[];
    manifestSrc?:string[];
    workSrc?: string[];
    baseUri?: string[];
    sandbox?: string[];
}

export type Filter = (request:Request, response:Response) => boolean;

const defaultFilter:Filter =  (req, res) => {

    const contentType:any = res.getHeader("content-type");

    if(
        contentType && typeof contentType === "string" &&
        (contentType.includes(("text/html")) || contentType.includes("image/svg+xml"))
    ){
        return true;
    }else{
        return false;
    }

};

function secureContent(
    contentSecurityPolicyDirectives:ContentSecurityPolicyDirectives={}, 
    filter:Filter = defaultFilter
){

    const directives:string[] = [];

    if(!contentSecurityPolicyDirectives.defaultSrc){
        directives.push("default-src 'self'");
    }
    
    for(let [directive, values] of Object.entries(contentSecurityPolicyDirectives)){
        const hyphenPosition = Array.prototype.findIndex.call(directive, (char:string) => /[A-Z]/.test(char));
        if(hyphenPosition !== -1){
            directive = directive.slice(0, hyphenPosition) + "-" + directive.slice(hyphenPosition).toLocaleLowerCase();
        }
        directives.push(directive + " " + values.join(" "));
    }

    const contentSecurityPolicyHeader = directives.join("; ");

    const decorateSetHeader = (setHeader:Function, req:Request, res:Response) => {
        return function (name:string, value: string | number | readonly string[]):Response {

            const newRes = setHeader.apply(this, [name, value]);

            if(filter(req, res)){
                setHeader.apply(this, ["content-security-policy", contentSecurityPolicyHeader]);
            }

            return newRes;
        }
    }

    const run:Middleware<Context> = ({req, res}, next) => {
        if(req.method === "GET"){
            res.setHeader = decorateSetHeader(res.setHeader, req, res);
        }
        
        next();
    };

    return run;
}

export default secureContent;