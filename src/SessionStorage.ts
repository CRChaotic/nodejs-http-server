export interface Session {
    [k:string|number]:any;
    id:string;
    creationTime:string;
    lastAccessedTime:string;
}

export interface SessionStorage {
    // set(id:string, value:object):Promise<Session>;
    get(id:string):Promise<Session|undefined>;
    add(value:object):Promise<Session>;
    update(id:string, value:object):Promise<Session|undefined>;
    has(id:string):Promise<boolean>;
    remove(id:string):Promise<void>;
    getSize():Promise<number>;
};