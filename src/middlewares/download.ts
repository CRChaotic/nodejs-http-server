import path from "path";
import { Context } from "../Context";
import { Middleware } from "../Middleware";
import { Next } from "../Next";


export type DownloadOptions = {
    rename?:string;
}

function download():Middleware<Context>{

    const handle = ({response}:Context, next:Next) => {

        const downloadData = async (filepath:string, { rename }:DownloadOptions = {}) => {
            response.sendFile(filepath, { 
                noSniff:false, 
                headers:{
                "content-disposition":`attachment; filename=${rename??path.basename(filepath)}`
            }});
        };

        response.download = downloadData;
        next();
    };

    return { handle };
}

export default download;