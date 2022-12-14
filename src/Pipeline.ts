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
        let error:Error|undefined;
        
        const run = async (index:number) => {

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
                console.error("Unhandle error", error.message);
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
