import { Context } from "../Context";
import { Middleware } from "../Middleware";
import { Next } from "../Next";
import parseMultiPart from "../utils/parseMultipart";

type Fields = {
    [k:string]:{
        value:string;
    };
}

type Files = {
    [k:string]:{
        filename:string;
        value:Buffer;
        type?:string;
    }
}

function resolveMultipartFormData():Middleware<Context>{

    const handle = (context:Context, next:Next) => {
        const {request:req, response:res } = context;

        if(req.method !== "POST"){
            next();
            return;
        }

        const matched = req.headers["content-type"]?.match(/multipart\/form-data;\s*boundary=(?<boundary>\S+)/);

        if(!matched || !matched.groups){
            next();
            return;
        }

        let body:Buffer[] = [];

        req.on("data", (chunk:Buffer) => {
            body.push(chunk);
        });

        req.on("end", () => {

            if(matched && matched.groups){
                const parsedMultipart = parseMultiPart(Buffer.concat(body), matched.groups.boundary);

                const fields:Fields = {};
                const files:Files = {};

                parsedMultipart.forEach((multipart) => {

                    const fieldName = multipart.headers["Content-Disposition"]?.match(/name="(?<fieldname>.+?)"/)?.groups?.fieldname; 
                    const filename = multipart.headers["Content-Disposition"]?.match(/filename="(?<filename>.+?)"/)?.groups?.filename; 

                    if(filename && fieldName){
                        const type =  multipart.headers["Content-Type"];

                        files[fieldName] =  {
                            filename,
                            value:multipart.value, 
                            type, 
                        };

                    }else if(fieldName){
                        fields[fieldName] = {
                            value:multipart.value.toString("utf-8"), 
                        };

                    }
                });

                req.multipart = {fields, files};
            }
            
            // console.log(parsedMultipart);

            next();
        });


        res.on('error', function(err) {
            console.log("Error during HTTP request");
            console.log(err.message);
        });
        
    };

    return { handle };
}

export default resolveMultipartFormData;


