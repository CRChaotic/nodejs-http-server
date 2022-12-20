export interface Session {
    [k:string|number]:any;
    creationTime:string;
    lastAccessedTime:string;
}

export interface SessionStorage {
    set(id:string, value:object):Promise<Session>;
    get(id:string):Promise<Session|undefined>;
    has(id:string):Promise<boolean>;
    remove(id:string):Promise<void>;
    getLength():Promise<number>;
};