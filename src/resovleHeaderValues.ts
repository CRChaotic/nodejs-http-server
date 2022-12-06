
const resovleHeaderValues = (value:string) => {

    const valuePairs = value.split(";");
  
    const headerValues:{[k:string]:string|boolean} = {};
  
    valuePairs.forEach((pair) => {
        const [multiKey, value=true] = pair.split("=");
        const keys = multiKey.split(",").map((key) => key.trim());
  
        if(keys.length > 1){
            keys.forEach((key) => headerValues[key] = value);
        }else if(keys.length === 1){
  
            if(typeof value === "boolean"){
                headerValues[keys[0]] = value;
            }else{
                headerValues[keys[0]] = value.replace(/"|'|\s/g, "");
            }
  
        }
       
    });
    
    console.log(headerValues);
  
    return headerValues;
  }

export default resovleHeaderValues;