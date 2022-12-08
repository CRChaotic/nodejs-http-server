import isJSON from "./isJSON";

const KeyRegExp = /^\s*(?<fieldName>\w+)\[(?<prop>[\w-]*)\]\s*$/;

function parseURLEncodedFormData(body:string){

    const form:{[k:string]:any} = {};

    body.split("&").forEach((pair) => {

        let [key, value] = pair.split("=").map(decodeURIComponent);

        if(isJSON(value)){
            value = JSON.parse(value);
        }

        const matched = key.match(KeyRegExp);
        if(matched){

            const fieldName = matched.groups?.fieldName.trim();
            const prop = matched.groups?.prop;
            if(fieldName != null && fieldName !== ""){

                if(!form[fieldName]){
                    form[fieldName] = {};
                }

                if(prop == null){
                    form[fieldName] = value;
                }else if(prop === ""){
                    const index = Object.keys(form[fieldName]).length;
                    form[fieldName][index] = value;
                }else if(typeof prop === "string"){
                    form[fieldName][prop] = value;
                }
            }
            
        }else{
            form[key] = value;
        }

    });

    return form;
}

export default parseURLEncodedFormData;