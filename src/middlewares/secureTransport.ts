import { Context } from "../Context";
import { Middleware } from "../Middleware";
import { Next } from "../Next";

export type SecureTransportOptions = {
    maxAge?:number;
    includeSubDomains?:boolean;
};

function secureTransport({maxAge = 31536000, includeSubDomains = true}:SecureTransportOptions = {}):Middleware<Context>{

    const handle = ({response}:Context, next:Next) => {
        let strictTransportSecurity = `max-age=${maxAge}`;
        if(includeSubDomains){
            strictTransportSecurity += "; includeSubDomains";
        }

        response.setHeader("strict-transport-security", strictTransportSecurity);
        next();
    };

    return { handle };
}

export default secureTransport;