export const JSONparse = (i: string, reviver?: (this: any, key: string, value: any) => any ):JSONParseRetrun=>{
    try{
        return { data: JSON.parse(i, reviver), err:null }
    }catch(er){
        const err = er as Error
        return { data:null, err }
    }   
}
export default JSONparse

// #region interfaces
type JSONParseRetrun  = JSONParseData | JSONParseErr
interface JSONParseData{
    data: unknown
    err: null
}

interface JSONParseErr{
    data: null
    err: Error
}
// #endregion interfaces