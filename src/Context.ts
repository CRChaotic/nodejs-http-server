import { Request } from "./Request";
import { Response } from "./Response";

export type Context = {
    request:Request;
    response:Response;
}