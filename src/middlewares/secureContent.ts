import { Context } from "../Context";
import { Middleware } from "../Middleware";
import { Next } from "../Next";
import { Request } from "../Request";
import { Response } from "../Response";


type ContentSecurityPolicyDirectives = {
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

type SecureContentFilter = (request:Request, response:Response) => boolean;

export type SecureContentOptions = {
    directives?:ContentSecurityPolicyDirectives;
    filter?:SecureContentFilter;
}

const defaultFilter:SecureContentFilter =  (req:Request, res:Response) => {

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

function secureContent({directives = {}, filter = defaultFilter}:SecureContentOptions = {}):Middleware<Context>{

    const directiveList:string[] = [];

    if(!directives.defaultSrc){
        directiveList.push("default-src 'self'");
    }
    
    for(let [directive, values] of Object.entries(directives)){
        const hyphenPosition = Array.prototype.findIndex.call(directive, (char:string) => /[A-Z]/.test(char));
        if(hyphenPosition !== -1){
            directive = directive.slice(0, hyphenPosition) + "-" + directive.slice(hyphenPosition).toLocaleLowerCase();
        }
        directiveList.push(directive + " " + values.join(" "));
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