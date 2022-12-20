import { IncomingMessage } from "http";
import { Http2ServerRequest } from "http2";

export type Request =  Http2ServerRequest & {
    cookie:{
        [k:string]:string|undefined;
    };
    [k:string]:any;
}