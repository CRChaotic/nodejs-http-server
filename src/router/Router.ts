import queryString from "querystring";
import { Request } from "../Request";
import { Response } from "../Response";
import { Middleware } from "../Middleware";
import { Next } from "../Next";
import { Context } from "../Context";

type Method = "GET"|"POST"|"PUT"|"DELETE"|"HEAD"|"OPTIONS";

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

class Router implements Middleware<Context>{

    #getRoute:Map<string, Route>;
    #postRoute:Map<string, Route>;
    #deleteRoute:Map<string, Route>;
    #putRoute:Map<string, Route>;
    #fallback:Map<Method, RouterCallback>;
    #optionsRoute:Map<string, Route>;
    #headRoute:Map<string, Route>;

    constructor(){
        this.#getRoute = new Map();
        this.#postRoute = new Map();
        this.#deleteRoute = new Map();
        this.#putRoute = new Map();
        this.#fallback = new Map();
        this.#optionsRoute = new Map();
        this.#headRoute = new Map();
        this.#fallback = new Map();
    }

    static getPathRegExp(path:string){
        return new RegExp("^"+path.replace(/:([^/]+)/g, "(?<$1>[^/]+)")+"$");
    }

    addRoute(method:Method, path:string, callback:RouterCallback): Router{
        if(path === "/*"){
            this.#fallback.set(method, callback);
            return this;
        }

        const regExp = Router.getPathRegExp(path);
        console.info("[INFO] Add route:", {method, path, regExp});
    
        switch(method){
            case "GET":
                this.#getRoute.set(path, {regExp, callback});
                break;
            case "POST":
                this.#postRoute.set(path, {regExp, callback});
                break;
            case "DELETE":
                this.#deleteRoute.set(path, {regExp, callback});
                break;
            case "PUT":
                this.#putRoute.set(path, {regExp, callback});
                break;
            case "HEAD":
                this.#headRoute.set(path, {regExp, callback});
                break;
            default:
                throw new Error("method must be one of get, post, put, delete, options or head");
        }

        return this;
    }
    
    async handle(context: Context, next: Next): Promise<void> {
        const {request, response} = context;
        const method = request.method;
        let routeMap:Map<string, Route>|null = null;

        switch(method){
            case "GET":
                routeMap = this.#getRoute;
                break;
            case "POST":
                routeMap = this.#postRoute;
                break;
            case "PUT":
                routeMap = this.#putRoute;
                break;
            case "DELETE":
                routeMap = this.#deleteRoute;
                break;
            case "OPTIONS":
                routeMap = this.#optionsRoute;
                break;
            case "HEAD":
                routeMap = this.#headRoute;
                break;
            default:
                throw new Error("Middleware<Router>: request method is not spported");
        }

        const url = new URL(request.url??"/", `http://${request.headers.host}`);
        const path = url.pathname;

        let queries = queryString.parse(url.search.slice(1));
        let params = {};
        let route = routeMap.get(path);

        //try out relative route
        if(!route){
            
            for(let relativeRoute of routeMap.values()){

                const matched = path.match(relativeRoute.regExp);
    
                if(matched && matched.groups){
                    // console.log(matched);
                    params = matched.groups;
                    route = relativeRoute;
                    break;
                }
            }
        }

        //fallback route
        if(!route){
            response.statusCode = 404;
            route = {regExp:/\/\*/, callback:this.#fallback.get(method)??defaultCallback}
        }

        Object.defineProperties(request, {
            query:{
                value:queries,
                writable:false,
                enumerable:true,
            },
            param:{
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