import * as http from "http";

export interface Request extends http.IncomingMessage{
    [k:string]:any;
}

export interface Response extends http.ServerResponse{
    [k:string]:any;
}

export type Context = {
    req:Request;
    res:Response;
}

export type Next = () => void;

export interface Middleware<T>{
    (context:T, next:Next, error:unknown): Promise<void>|void;
}

export type Pipeline<T> = {
    push: (...middlewares: Middleware<T>[]) => void;
    execute: (context: T) => void;
}