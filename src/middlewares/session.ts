import { Context } from "../Context";
import { Next } from "../Next";
import { Session, SessionStorage } from "../SessionStorage";
import { SetCookieOptions } from "./responseCookie";

export type SessionOptions = {
    autoRemoveInterval?:number;
    maxAge?:number;
}

export type SessionSaveOptions = {
    regenerateID?:boolean;
} & SetCookieOptions;

//TO DO
function session(name:string, storage:SessionStorage, {autoRemoveInterval = 10, maxAge=30}:SessionOptions = {}){

    const activeSessions = new Map<string, NodeJS.Timeout>(); 

    const schduleAutoRemove = (id:string) => {
        const timer = activeSessions.get(id);
        if(timer){
            timer.refresh();
        }else{
            const timer = setTimeout(() => storage.remove(id), autoRemoveInterval*1000);
            activeSessions.set(id, timer);
        }
    };

    const handle = async ({request, response}:Context, next:Next) => {

        request.session = {
            async get(){
                const id = request.cookie[name];
                if(id == null){
                    return;
                }

                const session = await storage.get(id);
                if(session != null){
                    schduleAutoRemove(id);
                    return session;
                }
            },
            async save(value:object, {regenerateID = false, ...options}:SessionSaveOptions = {}){

                const id = request.cookie[name];
                let session:Session|undefined;

                if(id != null && !regenerateID && await storage.has(id)) {
                    // session = await storage.set(id, value);
                    session = await storage.update(id, value);

                }else{
                    if(id != null){
                        clearTimeout(activeSessions.get(id));
                        activeSessions.delete(id);
                        storage.remove(id);
                    }
                    // const newId = generateID();
                    session = await storage.add(value);
                    response.setCookie(name, session.id, {...options, maxAge});
                    // session = await storage.set(newId, value);

                    schduleAutoRemove(session.id);
                }

                if(session != null){
                    Object.defineProperties(session, {
                        id:{
                            value:session.id,
                            writable:false,
                            enumerable:true
                        },
                        lastAccessedTime:{
                            value:session.lastAccessedTime,
                            writable:false,
                            enumerable:true
                        },
                        creationTime:{
                            value:session.creationTime,
                            writable:false,
                            enumerable:true
                        }
                    });
                }


                return session;
            },
            async getSize(){
                return await storage.getSize();
            }
        };

        next();
    };

    return { handle };
}

export default session;