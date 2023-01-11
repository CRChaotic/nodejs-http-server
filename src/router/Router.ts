import queryString from "querystring";
import { Request } from "../Request";
import { Response } from "../Response";
import { Middleware } from "../Middleware";
import { Next } from "../Next";
import { Context } from "../Context";

type Method = "GET"|"POST"|"PUT"|"DELETE"|"PATCH"|"HEAD"|"OPTIONS";

type RouterCallback = (
    request: Request,
    response: Response
) => Promise<void>|void; 

type Route = {
    regExp:RegExp; 
    callback:RouterCallback;
}

function defaultCallback(req:Request, res:Response){
    res.setHeader("content-type", "text/html");
    res.write("<h1>Oops route does not exist<h1>");
    res.end();
}

const DEFAULT_ACCEPT_METHOD: Method[] = ["GET", "POST", "PUT", "DELETE", "PATCH"];

export type RouterOptions = {
    fallbackPath?:string;
    caseSensitive?:boolean;
    acceptMethod?:Method[];
}

class Router implements Middleware<Context>{

    #routeMap:Map<Method, Map<string, Route>>;
    #fallback:Map<Method, RouterCallback>;
    #fallbackPath:string;
    #caseSensitive:boolean;

    constructor({fallbackPath = "/*", caseSensitive = true, acceptMethod = DEFAULT_ACCEPT_METHOD}:RouterOptions = {}){

        this.#fallback = new Map();
        this.#fallbackPath = fallbackPath;
        this.#routeMap = new Map();
        this.#caseSensitive = caseSensitive;

        acceptMethod.forEach((method) => {
            this.#routeMap.set(method, new Map());
        });
    }

    getPathRegExp(path:string){
        if(this.#caseSensitive){
            return new RegExp("^"+path.replace(/:([^/]+)/g, "(?<$1>[^/]+)")+"$");
        }else{
            return new RegExp("^"+path.replace(/:([^/]+)/g, "(?<$1>[^/]+)")+"$", "i");
        }
    }

    addRoute(method:Method, path:string, callback:RouterCallback): Router{
        if(path === this.#fallbackPath){
            this.#fallback.set(method, callback);
            return this;
        }

        const regExp = this.getPathRegExp(path);
        console.info("[INFO] Add route:", {method, path, regExp});

        const specificRouteMap = this.#routeMap.get(method);
        if(specificRouteMap != null){
            specificRouteMap.set(path, {callback, regExp})
        }else{
            throw new Error("router does not support method "+ method);
        }

        return this;
    }

    async handle(context: Context, next: Next): Promise<void> {
        const {request, response} = context;
        const method = request.method as Method;

        const specificRouteMap:Map<string, Route>|undefined = this.#routeMap.get(method);
        if(specificRouteMap == null){
            next(new Error("Router does not support method " + method));
            return;
        }

        const url = new URL(request.url??"/", `http://${request.headers.host}`);
        const path = url.pathname;

        let queries = queryString.parse(url.search.slice(1));
        let params:{[k:string]:string} = {};

        let route = specificRouteMap.get(path);
        //try out relative route
        if(!route){
            
            for(let relativeRoute of specificRouteMap.values()){

                const matched = path.match(relativeRoute.regExp);
    
                if(matched){
                    // console.log(matched);
                    if(matched.groups){
                        params = matched.groups;
                    }
                    route = relativeRoute;
                    break;
                }
            }
        }

        //fallback route
        if(!route){
            response.statusCode = 404;
            route = {regExp:/\/\*/, callback:this.#fallback.get(method)??defaultCallback};
        }

        Object.defineProperties(request, {
            queries:{
                value:queries,
                writable:false,
                enumerable:true,
            },
            params:{
                value:params,
                writable:false,
                enumerable:true
            }
        });
         
        try{
            await route.callback(request, response);
        }catch(error){
            next(error);
        }
    };
    
}

export default Router;