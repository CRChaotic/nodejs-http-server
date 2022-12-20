import { ServerResponse } from "http";
import { Http2ServerResponse } from "http2";
import { SetCookieOptions } from "./middlewares/responseCookie";
import { SendFileOptions } from "./middlewares/sendFile";

export type Response = Http2ServerResponse & {
    setCookie: (name:string, value:number|string|object, options?:SetCookieOptions) => void;
    sendFile: (filepath:string, options?:SendFileOptions) => void;
    [k:string]:any;
};