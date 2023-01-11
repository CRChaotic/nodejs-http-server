import { Context } from "../Context";
import { Middleware } from "../Middleware";
import { Next } from "../Next";
import { Request } from "../Request";
import { Response } from "../Response";


type ContentSecurityPolicyDirectives = {
    "default-src"?: string[]
    "script-src"?: string[];
    "style-src"?: string[]; 
    "img-src"?: string[];
    "media-src"?: string[];
    "font-src"?: string[];
    "object-src"?: string[];
    "frame-src"?: string[];
    "manifest-src"?:string[];
    "work-src"?: string[];
    "connect-src"?:string[];
    "base-uri"?: string[];
    "frame-ancestors"?: string[]; 
    "form-action"?: string[];
    "sandbox"?: string[];
    "upgrade-insecure-requests"?:boolean, 
}

type SecureContentFilter = (request:Request, response:Response) => boolean;

export type SecureContentOptions = {
    directives?:ContentSecurityPolicyDirectives;
    upgradeInsecureRequests?:boolean;
    filter?:SecureContentFilter;
}

const defaultFilter:SecureContentFilter =  (req:Request, res:Response) => {

    const contentType = res.getHeader("content-type");

    if(
        typeof contentType === "string" &&
        (contentType.includes(("text/html")) || contentType.includes("image/svg+xml"))
    ){
        return true;
    }else{
        return false;
    }

};

function secureContent({
    directives = {}, 
    filter = defaultFilter
}:SecureContentOptions = {}):Middleware<Context>{

    const directiveList:string[] = [];
    const upgradeInsecureRequests = directives["upgrade-insecure-requests"]??true;

    if(!directives["default-src"]){
        directiveList.push("default-src 'self'");
    }
    if(!directives["style-src"]){
        directiveList.push("style-src 'self' 'unsafe-inline' https:");
    }
    if(!directives["img-src"]){
        directiveList.push("img-src 'self' data:");
    }
    if(!directives["font-src"]){
        directiveList.push("font-src 'self' data:");
    }
    if(!directives["object-src"]){
        directiveList.push("object-src 'none'");
    }
    if(upgradeInsecureRequests){
        directiveList.push("upgrade-insecure-requests");
    }
    
    for(let [directive, values] of Object.entries(directives)){
        // const hyphenPosition = Array.prototype.findIndex.call(directive, (char:string) => /[A-Z]/.test(char));
        // if(hyphenPosition !== -1){
        //     directive = directive.slice(0, hyphenPosition) + "-" + directive.slice(hyphenPosition).toLocaleLowerCase();
        // }
        if(Array.isArray(values)){
            directiveList.push(directive + " " + values.join(" "));
        }
    }

    const contentSecurityPolicyHeader = directiveList.join("; ");

    const decorateSetHeader = (setHeader:Function, req:Request, res:Response) => {
        return function (this:Response, name:string, value: string | number | readonly string[]):Response {

            const newRes = setHeader.apply(this, [name, value]);

            if(filter(req, res)){
                setHeader.apply(this, ["content-security-policy", contentSecurityPolicyHeader]);
            }

            return newRes;
        }
    }

    const handle = ({request, response}:Context, next:Next) => {
        if(request.method === "GET"){
            response.setHeader = decorateSetHeader(response.setHeader, request, response);
        }
        
        next();
    };

    return { handle };
}

export default secureContent;