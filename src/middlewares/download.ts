import path from "path";
import { Context, Middleware } from "../types";


function download(){

    const run:Middleware<Context> = ({res}, next) => {

        const downloadData = ({filepath, filename, type}:{filepath:string, filename?:string, type?:string}) => {
            if(!filename){
                filename = path.basename(filepath);
            }

            res.setHeader("Content-Disposition",`attachment; filename=${filename}`);
            res.sendFile(filepath, type);
        };

        res.download = downloadData;
        next();
    };

    return run;
}

export default download;