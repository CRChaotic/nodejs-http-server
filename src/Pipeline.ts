import { ErrorHandler } from "./ErrorHandler";
import { Middleware } from "./Middleware";

class Pipeline<T> {

    #middlewares:Middleware<T>[];
    #errorhandlers:ErrorHandler<T>[];

    constructor(middlewares:Middleware<T>[], errorHandlers:ErrorHandler<T>[]){
        this.#middlewares = middlewares;
        this.#errorhandlers = errorHandlers;
    }

    push(middlewares:Middleware<T>[]){
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
        
        const run = (index:number, error?:unknown) => {

            if(preIndex === index){
                throw Error("next() is called multiple times");
            }
            preIndex = index;

            if(!error){

                const middleware:Middleware<T>|null = this.#middlewares[index];
                middleware.handle(context, (error) => {
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
                errorHandler.handle(error, context, (error) => {
                    if(error){
                        run(index + 1, error);
                    }
                });

            }
        };

        run(0);
    }

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