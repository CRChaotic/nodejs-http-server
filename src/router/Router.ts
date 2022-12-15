import { Context } from "../types";
import queryString from "querystring";
import { MiddlewareBeta, Next } from "../Pipeline";
import { IncomingMessage, ServerResponse } from "http";

type Method = "GET"|"POST"|"PUT"|"DELETE"|"HEAD"|"OPTIONS";

type RouterCallback = (
    req:IncomingMessage,
    res:ServerResponse
) => Promise<void>|void; 

type Route = {
    regExp:RegExp; 
    callback:RouterCallback;
}

function defaultCallback(req:IncomingMessage, res:ServerResponse){
    res.setHeader("content-type", "text/html");
    res.write("<h1>Oops route does not exist<h1>");
    res.end();
}

class Router implements MiddlewareBeta<Context>{

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

    addRoute(method:Method, path:string, callback:RouterCallback){

        if(path === "/*"){
            this.#fallback.set(method, callback);
            return;
        }

        const regExp = Router.getPathRegExp(path);
    
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
    }
    
    handle(context: Context, next: Next): void | Promise<void> {
        const {req, res} = context;
        const method = req.method;
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

        const url = new URL(req.url??"/", `http://${req.headers.host}`);
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
            res.statusCode = 404;
            route = {regExp:/\/\*/, callback:this.#fallback.get(method)??defaultCallback}
        }

        req.queries = queries;
        req.params = params;
        route.callback(req, res);
    };
    
}

export default Router;