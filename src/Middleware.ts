import { Next } from "./Next";

export interface Middleware<T>{
    handle(context:T, next:Next): Promise<void>|void;
    [k:string]:any;
}
