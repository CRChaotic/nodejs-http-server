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

    const set = async (id:string, value:Session) => {

        const session = sessionMap.get(id);
        const lastAccessedTime = formatDatetime(new Date(), "yyyy-MM-dd hh:mm:ss");

        if(session != null){
            Object.assign(session, {...value, lastAccessedTime});
            return {...session};
        }else{
            const newSession = {
                ...value,
                creationTime:lastAccessedTime,
                lastAccessedTime
            };
            sessionMap.set(id, newSession);
            return {...newSession};
        }

    };

    const remove = async(id:string) =>{
        sessionMap.delete(id);
    };

    const getLength = async () => {
        return sessionMap.size;
    };

    return {set, get, has, remove, getLength};
}

export default InMemorySessionStorage;