/**
 * Crunmpets
 * @description A simplief stackable bearer token
 * @author Eric D Moore
 * @license MIT
 * @language Typescript
 * @priorArt macaroons, paseto
 * @goals
 * 
 * Opinionated for Simplicity
 * 
 * 
 */

import {URL} from 'url'
import { createCipheriv } from 'crypto'

type PromiseOR<T> =  T | Promise<T>
type PromisingFunction<T> = ((i:string)=>Promise<T>)
type Dict<T> = {[key:string]:T}
type List<T> = T[]
type Tuples = string[]
interface IHeaders{
    alg: 'chacha20-poly1305'
    enc: 'id' | 'br'
}
interface IConfiguration{
    compressAfter? :number
}

interface IOptions {
    headers: IHeaders
    footers: Dict<string>
    cfg: IConfiguration
    keyFetcher?: PromisingFunction<string>
}

interface ICrumpet{
    addCaveats: (caveats: List<Tuples>) => ICrumpet
    addExternalCaveats: (issuer: string, pKey:number, caveats: List<Tuples>) => ICrumpet
    addHeaders: (addHeaders:IHeaders) => ICrumpet
    addFooters: (addFooters:Dict<string>) => ICrumpet
    fetchRemoteKey?: (fetcherFn: PromisingFunction<string> ) => ICrumpet
    // promised because we might compress
    toURL: () => Promise<URL>
    toJSON: () => Promise<string>
    toBase64: () => Promise<string>
    toFunction: (secret:string, as:'json'| 'base64'|'url') => Promise<string>
    isValid: () => Promise<boolean>
    ensureValid: () => void
}

// #region starters
const fromURL = (url:string | URL, param:string = 't') : ICrumpet=>{
    const u = new URL(url.toString())
    // parse u
    return create('issuer', 'sec')
}

const fromJSON = (json:string)=>{
    // parse
    return create('issuer', 'sec')
}

const fromBase64 = (issuer:PromiseOR<string>, secret:PromiseOR<string>, initalCond: List<Tuples>=[], opts: IOptions) => 
    ()=>{
        // parse base64
        return create(issuer, secret, initalCond, opts)
    }

const create = (
    issuer:PromiseOR<string>, 
    secret:PromiseOR<string>, 
    initalCond: List<Tuples> = [], 
    opts: IOptions = {
        headers:{alg:'chacha20-poly1305', enc:'id'}, 
        footers:{}, 
        cfg:{compressAfter:768}
    }
):ICrumpet => {
    return {
        addCaveats: addCaveats(issuer, secret, initalCond, opts),
        addFooters: addFooters(issuer, secret, initalCond, opts),
        addHeaders: addHeaders(issuer, secret, initalCond, opts), 
        addExternalCaveats: addExternalCaveats(issuer, secret, initalCond, opts),
        fetchRemoteKey: fetchRemoteKey(issuer, secret, initalCond, opts),
        toJSON: toJSON(issuer, secret, initalCond, opts),
        toURL: toURL(issuer, secret, initalCond, opts),
        toBase64: toBase64(issuer, secret, initalCond, opts),
        toFunction: toFunction(issuer, secret, initalCond, opts),
        isValid: isValid(issuer, secret, initalCond, opts),
        ensureValid: ensureValid(issuer, secret, initalCond, opts),
    }
}
// #endregion starters

const fetchRemoteKey = (issuer:PromiseOR<string>, secret:PromiseOR<string>, initalCond: List<Tuples>=[], opts: IOptions) => 
    (fetcherFn: PromisingFunction<string>):ICrumpet=> {
        return create(issuer, secret, initalCond, {...opts, keyFetcher: fetcherFn})
    }

// #region chainingAdders
const addCaveats = (issuer:PromiseOR<string>, secret:PromiseOR<string>, initalCond: List<Tuples>=[], opts: IOptions) => 
    (caveats: List<Tuples>) => {
        return create(issuer, secret, initalCond.concat(caveats), opts)
    }

const addExternalCaveats =  (issuer:PromiseOR<string>, secret:PromiseOR<string>, initalCond: List<Tuples>=[], opts: IOptions) =>
    (externaParty:string, puKey:number, caveats: List<Tuples>) => {
        return create(issuer, secret, initalCond.concat( [externaParty, puKey.toString(), '##', ...caveats] as Tuples), opts)
    }

const addFooters = (issuer:PromiseOR<string>, secret:PromiseOR<string>, initalCond: List<Tuples>=[], opts: IOptions) => (addFooters:Dict<string>) => {
    return create(issuer, secret, initalCond, {...opts, footers: {...opts.footers, ...addFooters}})
}

const addHeaders = (issuer:PromiseOR<string>, secret:PromiseOR<string>, initalCond: List<Tuples>=[], opts: IOptions) =>(addHeaders:IHeaders) => {
    return create(issuer, secret, initalCond, {...opts, headers:{ ...opts.headers, ...addHeaders}})
}
// #endregion chainingAdders

// #region validators
const isValid = (issuer:PromiseOR<string>, secret:PromiseOR<string>, initalCond: List<Tuples>=[], opts: IOptions) => async () => {
    return true
}
const ensureValid = (issuer:PromiseOR<string>, secret:PromiseOR<string>, initalCond: List<Tuples>=[], opts: IOptions) => async () => {
    // no return 
}
// #endregion validators

// #region serializers/exporters
const toJSON = (issuer:PromiseOR<string>, secret:PromiseOR<string>, initalCond: List<Tuples>=[], opts: IOptions) => async ()=>{
    return ''
}

const toBase64 = (issuer:PromiseOR<string>, secret:PromiseOR<string>, initalCond: List<Tuples>=[], opts: IOptions) => async ()=>{
    // set header.enc to 'br' if it does get compressed 
    return ''
}

const toURL = (issuer:PromiseOR<string>, secret:PromiseOR<string>, initalCond: List<Tuples>=[], opts: IOptions) => async (param:string = 't')=>{
    // set header.enc to 'br' if it does get compressed 
    return new URL('')
}

const toFunction = (issuer:PromiseOR<string>, _:PromiseOR<string>, initalCond: List<Tuples>=[], opts: IOptions) => {
    // set header.enc to 'br' if it does get compressed 
    return async (secret: PromiseOR<string>, outputFmt: 'base64' | 'url' | 'json')=>{
        switch(outputFmt){
            case 'base64':
                return create(issuer, secret, initalCond, opts).toBase64()
            case 'url':
                    return await (await (create(issuer, secret, initalCond, opts).toURL())).toString()
            case 'json':
                return create(issuer, secret, initalCond, opts).toJSON()
        }
    }
}

const makeSignature = async (secret:PromiseOR<string>, finalConditions: List<Tuples>=[], opts: IOptions) => {
    const sec = await secret as string   

    finalConditions.forEach((v,i,a)=>{
        if(i === 0){
            v = [...v, 
                createCipheriv('chacha20-poly1305', sec, sec)
                  .update(v.toString())
                  .toString()
            ]
        }else{
            const priorSig = a[i-1].slice(-1)[0]
            v = [...v, 
                createCipheriv('chacha20-poly1305', priorSig, priorSig)
                .update(v.toString())
                .toString()]
        }
    })

    return finalConditions.slice(-1)[0].slice(-1)[0]
}

// #endregion serializers/exporters



export const crumpetBakery = {create, fromBase64, fromJSON, fromURL}
export default crumpetBakery