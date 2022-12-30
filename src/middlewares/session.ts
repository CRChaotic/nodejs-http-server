import { randomUUID } from "crypto";
import { Context } from "../Context";
import { Next } from "../Next";
import { Session, SessionStorage } from "../SessionStorage";
import { SetCookieOptions } from "./responseCookie";

export type SessionOptions = {
    generateID?:() => string;
    autoRemoveInterval?:number;
    maxAge?:number;
}

export type SessionSaveOptions = {
    regenerateID?:boolean;
} & SetCookieOptions;

//TO DO
function session(name:string, storage:SessionStorage, {generateID = randomUUID, autoRemoveInterval = 10, maxAge=30}:SessionOptions = {}){

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
                if(session){
                    schduleAutoRemove(id);
                    return session;
                }
            },
            async save(value:object, {regenerateID = false, ...options}:SessionSaveOptions = {}){

                const id = request.cookie[name];
                let session:Session;

                if(id != null && !regenerateID) {
                    session = await storage.set(id, value);
                }else{
                    if(id != null){
                        clearTimeout(activeSessions.get(id));
                        activeSessions.delete(id);
                        storage.remove(id);
                    }
                    const newId = generateID();
                    response.setCookie(name, newId, {...options, maxAge});
                    session = await storage.set(newId, value);
                    schduleAutoRemove(newId);
                }

                Object.defineProperties(session, {
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

                return session;
            },
            async getSize(){
                return await storage.getLength();
            }
        };

        next();
    };

    return { handle };
}

export default session;