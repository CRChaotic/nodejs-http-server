import { Context, Middleware } from "../types";

export type DownloadOptions = {
    rename?:string;
}

function download(){

    const run:Middleware<Context> = ({res}, next) => {

        const downloadData = async (root:string, filename:string, { rename }:DownloadOptions = {}) => {
            res.sendFile(root, filename, { 
                lastModified:false, 
                noSniff:false, 
                headers:{
                "content-disposition":`attachment; filename=${rename??filename}`
            }});
        };

        res.download = downloadData;
        next();
    };

    return run;
}

export default download;