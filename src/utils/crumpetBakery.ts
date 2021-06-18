/**
 * @titke Crumpets : Stackable Cookies
 * @author [Eric D Moore](https://ericdmoore.com)
 * @description A  stackable bearer token library 
 * user-composable & server-issued bearer tokens for authZ (not authN)
 * server issues a bearer token
 * AND clients can compose/add new qualifiers while keeping the token verifiable fro the server  
 * - akin to Mozilla Macaroons 
 * - except with no 3rd party verifiable claims
 * - crypto libs chosen via paseto
 * @license MIT
 * @language Typescript(4.3) / node15.12
 * @priorArt macaroons, paseto
 * @principles 
 * - Opinionated for Simplicity
 * - Opinionated for Simplicity
 * @copyright 2021 © Eric Moore. All Rights Reservered.
 * @refs
 * @see https://www.derpturkey.com/chacha20poly1305-aead-with-node-js/
 */

import { URL } from 'url'
import { createHmac } from 'crypto'

// #region interfaces
type PromiseOR<T> =  T | Promise<T>
type PromisingFunction<T> = ((i:string)=>Promise<T>)
type Dict<T> = {[key:string]:T}
type List<T> = T[]
type Tuples = string[]
interface IHeaders{
    alg: 'chacha20-poly1305' | 'ed'
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
    addHeaders: (addHeaders:IHeaders) => ICrumpet
    addFooters: (addFooters:Dict<string>) => ICrumpet
    //
    // addExternalCaveats: (issuer: string, pKey:number, caveats: List<Tuples>) => ICrumpet
    //
    // promised due to possible compression
    toURL: () => Promise<URL>
    toJSON: () => Promise<string>
    toBase64: () => Promise<string>
    toFunction: (secret:string, as:'json'| 'base64'|'url') => Promise<string>
    isValid: () => Promise<boolean>
    ensureValid: () => void
}

// #endregion interfaces

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

const fromBase64 = (base64Str: string) => 
    ()=>{
        // parse base64
        return create('issuer', 'secret')
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
    // partial execute each of the method builder functions
    return {
        addCaveats: addCaveats(issuer, secret, initalCond, opts),
        addFooters: addFooters(issuer, secret, initalCond, opts),
        addHeaders: addHeaders(issuer, secret, initalCond, opts), 
        // addExternalCaveats: addExternalCaveats(issuer, secret, initalCond, opts),
        toJSON: toJSON(issuer, secret, initalCond, opts),
        toURL: toURL(issuer, secret, initalCond, opts),
        toBase64: toBase64(issuer, secret, initalCond, opts),
        toFunction: toFunction(issuer, secret, initalCond, opts),
        isValid: isValid(issuer, secret, initalCond, opts),
        ensureValid: ensureValid(issuer, secret, initalCond, opts),
    }
}
// #endregion starters

// #region chainingAdders
const addCaveats = (issuer:PromiseOR<string>, secret:PromiseOR<string>, initalCond: List<Tuples>=[], opts: IOptions) => 
    (caveats: List<Tuples>) => {
        return create(issuer, secret, initalCond.concat(caveats), opts)
    }

// const addExternalCaveats =  (issuer:PromiseOR<string>, secret:PromiseOR<string>, initalCond: List<Tuples>=[], opts: IOptions) =>
//     (externaParty:string, puKey:number, caveats: List<Tuples>) => {
//         return create(issuer, secret, initalCond.concat( [externaParty, puKey.toString(), '##', ...caveats] as Tuples), opts)
//     }

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
    // issuer the first constraint
    // colon sep terms
    // term:value (newline)

    const sig = await makeFinalSignature(secret, initalCond)
    return ''
}

const toURL = (issuer:PromiseOR<string>, secret:PromiseOR<string>, initalCond: List<Tuples>=[], opts: IOptions) => async (param:string = 't')=>{
    // set header.enc to 'br' if it does get compressed 
    return new URL('')
}

const toFunction = (issuer:PromiseOR<string>, _:PromiseOR<string>, initalCond: List<Tuples>=[], opts: IOptions) => {
    // set header.enc to 'br' if it does get compressed 
    return async (secret: PromiseOR<string>, outputFmt?: 'base64' | 'url' | 'json')=>{
        switch(outputFmt){
            case 'base64':
                return create(issuer, secret, initalCond, opts).toBase64()
            case 'url':
                    return await (await (create(issuer, secret, initalCond, opts).toURL())).toString()
            case 'json':
                return create(issuer, secret, initalCond, opts).toJSON()
            default:
                return create(issuer, secret, initalCond, opts).toBase64()
        }
    }
}

// #endregion serializers/exporters

// #region helpers
const getColumnOfSigs = async (secret:PromiseOR<string>, tupleData: List<Tuples>=[]) => {
    return tupleData.reduce((p,c,i,a)=>{
        const priorSec = lastOf(p)
        return [...c, createHmac('sha256', priorSec)
                .update(c.toString())
                .digest('base64')] as string[]
    },['','',await secret] as string[])
}

const lastOf = <T>(arr:T[])=>arr.slice(-1)[0]

const makeFinalSignature = async (secret:PromiseOR<string>, tupleData: List<Tuples>=[]) => {
    return tupleData.reduce((p,c)=>{
        return createHmac('sha256', p)
            .update(c.toString())
            .digest('base64')
    }, await secret)
}


// #endregion helpers

export const crumpetBakery = {create, fromBase64, fromJSON, fromURL}
export default crumpetBakery