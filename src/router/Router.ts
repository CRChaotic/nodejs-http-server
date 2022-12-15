import { Context, Middleware } from "../types";
import queryString from "querystring";
import { MiddlewareBeta, Next } from "../Pipeline";

type Method = "GET"|"POST"|"PUT"|"DELETE"|"HEAD"|"OPTIONS";

type Callback = (
    req:Request,
    res:Response
) => Promise<void>|void; 

type Route = {
    regExp:RegExp; 
    callback:Callback;
}

class Router implements MiddlewareBeta<Context>{

    #getRoute:Map<string, Route>;
    #postRoute:Map<string, Route>;
    #deleteRoute:Map<string, Route>;
    #putRoute:Map<string, Route>;
    #fallback:Map<Method, Callback>;
    #optionsRoute:Map<string, Route>;
    #headRoute:Map<string, Route>;

    constructor(){
        this.#getRoute = new Map<string, Route>();
        this.#postRoute = new Map<string, Route>();
        this.#deleteRoute = new Map<string, Route>();
        this.#putRoute = new Map<string, Route>();
        this.#fallback = new Map<Method, Callback>();
        this.#optionsRoute = new Map<string, Route>();
        this.#headRoute = new Map<string, Route>();
    }

    
    handle(context: Context, next: Next): void | Promise<void> {

    };
    
}