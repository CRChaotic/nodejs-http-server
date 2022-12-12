import { Context, Middleware } from "../types";

export type DownloadOptions = {
    root:string;
    filename:string;
    rename?:string;
}

function download(){

    const run:Middleware<Context> = ({res}, next) => {

        const downloadData = ({root, filename, rename}:DownloadOptions) => {
            res.setHeader("Content-Disposition",`attachment; filename=${rename??filename}`);
            res.sendFile({root, filename});
        };

        res.download = downloadData;
        next();
    };

    return run;
}

export default download;