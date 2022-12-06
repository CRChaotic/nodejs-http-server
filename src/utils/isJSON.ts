
function isJSON(str:string):Boolean{
    try{
        JSON.parse(str);
        return true;
    }catch{
        return false;
    }
}

export default isJSON;