import { randomUUID } from "crypto";
import { Session, SessionStorage } from "./SessionStorage";
import formatDatetime from "./utils/formatDateTime";

function InMemorySessionStorage():SessionStorage {

    const sessionMap = new Map<string, Session>();

    const get = async(id:string) => {
        const session = sessionMap.get(id);
        if(session != null){
            session.lastAccessedTime = formatDatetime(new Date(), "yyyy-MM-dd hh:mm:ss");
            return {...session};
        }
    };

    const has = async(id:string) =>{
        return sessionMap.has(id);
    };

    const add = async (value:object) => {
        const id = randomUUID();
        const lastAccessedTime = formatDatetime(new Date(), "yyyy-MM-dd hh:mm:ss");
        const newSession = {
            ...value,
            id,
            creationTime:lastAccessedTime,
            lastAccessedTime
        };
        sessionMap.set(id, newSession);

        return {...newSession};
    };

    const update = async (id:string, value:object) => {
        const session = sessionMap.get(id);

        if(session != null){
            const lastAccessedTime = formatDatetime(new Date(), "yyyy-MM-dd hh:mm:ss");
            Object.assign(session, {...value, id, lastAccessedTime, creationTime:session.creationTime});

            return {...session};
        }
    };

    // const set = async (id:string, value:Session) => {

    //     const session = sessionMap.get(id);
    //     const lastAccessedTime = formatDatetime(new Date(), "yyyy-MM-dd hh:mm:ss");

    //     if(session != null){
    //         Object.assign(session, {...value, id, lastAccessedTime, creationTime:session.creationTime});
    //         return {...session};
    //     }else{
    //         const newSession = {
    //             ...value,
    //             id,
    //             creationTime:lastAccessedTime,
    //             lastAccessedTime
    //         };
    //         sessionMap.set(id, newSession);
    //         return {...newSession};
    //     }

    // };

    const remove = async(id:string) =>{
        sessionMap.delete(id);
    };

    const getSize = async () => {
        return sessionMap.size;
    };

    // return {set, get, has, remove, getSize};
    return {add, update, get, has, remove, getSize};
}

export default InMemorySessionStorage;