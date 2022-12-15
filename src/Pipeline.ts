import { Context, Middleware, Pipeline } from "./types";

function Pipeline<T>(...middlewares:Middleware<T>[]){

    const queue:Middleware<T>[] = [];
    const exceptionQueue:Middleware<T>[] = [];

    const push:Pipeline<T>["push"] = (...middlewares:Middleware<T>[]) => {
        middlewares.forEach((middleware) => {

            if(middleware.length < 3){
                queue.push(middleware);
            }else if(middleware.length === 3){
                exceptionQueue.push(middleware);
            }

        });
    };

    push(...middlewares);

    const execute:Pipeline<T>["execute"] = (context:T) => {

        let preIndex = -1;
        let error:unknown = null;
        
        const run = (index:number) => {

            if(preIndex === index){
                throw Error("next called multiple times");
            }
            preIndex = index;

            let middleware:Middleware<T>|null = null;
            if(!error){
                middleware = queue[index];
            }else{
                middleware = exceptionQueue[index];
            }

            if(!error && middleware){

                middleware(context, (err) => {
                    if(err){
                        error = err;
                        index = -1;
                    }

                    run(index + 1);
                });

            }else if(error && middleware){

                middleware(context, (err) => {
                    error = err;
                    run(index + 1);
                }, error);

            }else if(error){
                console.error("Unhandle error ", error);
            }
        };

        run(0);
    };

    return {push, execute};
}

export default Pipeline;

// let pipeLineTest = Pipeline(
//     (ctx) => {
//         try{
//             console.log("1");
//             throw Error("Oops error");
//         }catch(error){
//             if(error instanceof Error){
//                 console.log("do something");
//                 error.message += " changed";
//                 throw error; 
//             }
//         }

//     },
//     () => {
//         console.log("2");
//     },
//     (ctx, next, error) => {
//         console.log("catch1:"+error);
//         next();
//     },
//     (ctx, next, error) => {
//         console.log("catch2:"+error);
//     },
// );

// pipeLineTest.execute({});

export type Next = (error?:Error) => void;

export interface MiddlewareBeta<T>{
    handle: (context:T, next:Next) => Promise<void>|void;
}

export interface ErrorHandler<T>{
    handle(error:Error, context:T, next:Next): Promise<void>|void;
}

export class PipelineBeta<T> {

    #middlewares:MiddlewareBeta<T>[];
    #errorhandlers:ErrorHandler<T>[];

    constructor(middlewares:MiddlewareBeta<T>[], errorHandlers:ErrorHandler<T>[]){
        this.#middlewares = middlewares;
        this.#errorhandlers = errorHandlers;
    }


    push(middlewares:MiddlewareBeta<T>[]){
        middlewares.forEach((middleware) => {
            this.#middlewares.push(middleware);
        });
    }

    pushErrorHandlers(errorHandlers:ErrorHandler<T>[]){
        errorHandlers.forEach((errorHandler) => {
            this.#errorhandlers.push(errorHandler);
        });
    }

    execute(context:T){

        let preIndex = -1;
        
        const run = (index:number, error?:Error) => {

            if(preIndex === index){
                throw Error("next() is called multiple times");
            }
            preIndex = index;

            if(!error){

                const middleware:MiddlewareBeta<T>|null = this.#middlewares[index];
                middleware?.handle(context, (error) => {
                    if(error){
                        index = -1;
                    }
                    run(index + 1, error);
                });

            }else {
                const errorHandler:ErrorHandler<T>|null = this.#errorhandlers[index];

                if(!errorHandler){
                    console.error("Unhandle error " + error);
                }
                errorHandler?.handle(error, context, (error) => {
                    if(error){
                        run(index + 1, error);
                    }
                });

            }
        };

        run(0);
    }

}