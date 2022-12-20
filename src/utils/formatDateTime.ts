
function formatDatetime(date:Date,format:string){

    const y = String(date.getFullYear());
    const rawM = date.getMonth() + 1;
    const M = rawM < 10 ? "0" + rawM : String(rawM);
    const rawd = date.getDate();
    const d = rawd < 10 ? "0" + rawd : String(rawd);
    const rawh = date.getHours();
    const h = rawh < 10 ? "0" + rawh : String(rawh);
    const rawm = date.getMinutes();
    const m = rawm < 10 ? "0" + rawm : String(rawm);
    const raws = date.getSeconds();
    const s = raws < 10 ? "0" + raws : String(raws);
    const rawf = date.getMilliseconds();
    const f = rawf < 10 ? "00" + rawf : rawf < 100 ? "0" + rawf : String(rawf);

    const datetime = format.replace(/(y{1,4}(?!y))|(M{1,2}(?!M))|(d{1,2}(?!d))|(h{1,2}(?!h))|(m{1,2}(?!m))|(s{1,2}(?!s))|(f{1,3}(?!f))/g, (match) => {
        switch(match[0]){
            case "y":
                return y.slice(y.length - match.length);
            case "M":
                return M.slice(M.length - match.length);
            case "d":
                return d.slice(d.length - match.length);
            case "h":
                return h.slice(h.length - match.length);
            case "m":
                return m.slice(m.length - match.length);
            case "s":
                return s.slice(s.length - match.length);
            case "f":
                return f.slice(0, match.length);
            default:
                return "";
        }
    });

    return datetime;
}

export default formatDatetime;