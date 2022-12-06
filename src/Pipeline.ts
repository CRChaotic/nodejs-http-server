import { Middleware, Pipeline } from "./types";

function Pipeline<T>(...middlewares:Middleware<T>[]){

    const queue:Middleware<T>[] = [];
    const exceptionQueue:Middleware<T>[] = [];

    const classifiyMiddleware = (middlewares:Middleware<T>[]) => {

        middlewares.forEach((middleware) => {

            if(middleware.length < 3){
                queue.push(middleware);
            }else if(middleware.length === 3){
                exceptionQueue.push(middleware);
            }

        });

    }

    classifiyMiddleware(middlewares);

    const push:Pipeline<T>["push"] = (...middlewares:Middleware<T>[]) => {
       classifiyMiddleware(middlewares);
    };

    const execute:Pipeline<T>["execute"] = (context:T) => {

        let preIndex = -1;
        let exception:unknown = null;
        
        const run = (index:number) => {

            if(preIndex === index){
                throw Error("next called multiple times");
            }

            let middleware:Middleware<T>|null = null;
            if(!exception){
                middleware = queue[index];
            }else{
                middleware = exceptionQueue[index];
            }

            if(middleware){

                try{
                    middleware(context, () => {
                        run(index + 1);
                    }, exception);
                }catch(error){
      
                    if(exception || exceptionQueue.length === 0){
                        throw error;
                    }else{
                        exception = error;
                        run(0);
                    }
                }

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
