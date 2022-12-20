import { Next } from "./Next";

export interface ErrorHandler<T>{
    handle(error:unknown, context:T, next:Next): Promise<void>|void;
}