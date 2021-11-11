/**
 * @titke Crumpets : Stackable Cookies
 * @author [Eric D Moore](https://ericdmoore.com)
 * @description A  stackable bearer token library
 * user-composable & server-issued bearer tokens for authZ (not authN)
 * @usecase
 * 1. server issues a bearer token
 * 2. Clients can compose/add new qualifiers while keeping the token verifiable from the server
 * - akin to Mozilla's Macaroons
 * - except with no 3rd party verifiable claims
 * - crypto libs chosen via paseto
 * @license MIT
 * @language Typescript(4.3) / node15.12
 * @priorArt macaroons, paseto
 * @principles
 * - Opinionated for Simplicity
 * @copyright 2021 © Eric Moore. All Rights Reservered.
 * @refs
 * @see https://www.derpturkey.com/chacha20poly1305-aead-with-node-js/
 */

import { URL } from 'url'
import { createHmac } from 'crypto'
import { brotliCompress } from 'zlib'
import { promisify } from 'util'
import { atob } from './base64'

// #region interfaces
type PromiseOR<T> = T | Promise<T>
type PromisingFunction<T> = ((i:string)=>Promise<T>)
type Dict<T> = {[key:string]:T}

interface IHeaders{
    alg: 'sha384' | 'ed25519'
    enc: 'id' | 'br'
}
interface IConfiguration{
    compressAfter :number
}

interface IOptions {
    headers: IHeaders
    footers: Dict<string>
    cfg: IConfiguration
    keyFetcher?: PromisingFunction<string>
}

interface ICrumpet{
    addCaveats: (caveats: Dict<string>) => ICrumpet
    addHeaders: (addHeaders:IHeaders) => ICrumpet
    addFooters: (addFooters:Dict<string>) => ICrumpet
    //
    // addExternalCaveats: (issuer: string, pKey:number, caveats: List<Tuples>) => ICrumpet
    //
    // promised due to possible compression
    toURL: () => Promise<URL>
    toJSON: () => Promise<string>
    toObject: () => Promise<{headers:Dict<string>, body:Dict<string>, footers:Dict<string>, sig:string}>
    toBase64: () => Promise<string>
    toFunction: (secret:string, as:'json'| 'base64'|'url') => Promise<string>
    isValid: () => Promise<boolean>
    ensureValid: () => void // throws
}

// #endregion interfaces

// #region starters
const fromURL = (url:string | URL, param:string = 't') : ICrumpet => {
  // const u = new URL(url.toString())
  // parse u
  return create('issuer', 'sec')
}

const fromJSON = (json:string) => {
  // parse
  return create('issuer', 'sec')
}

const fromBase64 = (base64Str: string) =>
  () => {
    // parse base64
    return create('issuer', 'secret')
  }

const create = (
  issuingDomain: PromiseOR<string>,
  secret: PromiseOR<string>,
  initalCond: Dict<string> = {},
  opts: IOptions = {
    headers: { alg: 'sha384', enc: 'id' },
    cfg: { compressAfter: 768 },
    footers: {}
  }
):ICrumpet => {
  // partial execute each of the method builder functions
  return {
    addCaveats: addCaveats(issuingDomain, secret, initalCond, opts),
    addFooters: addFooters(issuingDomain, secret, initalCond, opts),
    addHeaders: addHeaders(issuingDomain, secret, initalCond, opts),
    // addExternalCaveats: addExternalCaveats(issuer, secret, initalCond, opts),
    toObject: toObject(issuingDomain, secret, initalCond, opts),
    toJSON: toJSON(issuingDomain, secret, initalCond, opts),
    toURL: toURL(issuingDomain, secret, initalCond, opts),
    toBase64: toBase64(issuingDomain, secret, initalCond, opts),
    toFunction: toFunction(issuingDomain, secret, initalCond, opts),
    isValid: isValid(issuingDomain, secret, initalCond, opts),
    ensureValid: ensureValid(issuingDomain, secret, initalCond, opts)
  }
}
// #endregion starters

// #region chainingAdders
const addCaveats = (
  issuer:PromiseOR<string>,
  secret:PromiseOR<string>,
  initalCond: Dict<string> = {},
  opts: IOptions) =>
  (caveats: Dict<string>) => {
    return create(issuer, secret, { ...initalCond, ...caveats }, opts)
  }

// not supported for now
// perhaps never supported
//
// const addExternalCaveats =  (issuer:PromiseOR<string>, secret:PromiseOR<string>, initalCond: List<Tuples>=[], opts: IOptions) =>
//     (externaParty:string, puKey:number, caveats: List<Tuples>) => {
//         return create(issuer, secret, initalCond.concat( [externaParty, puKey.toString(), '##', ...caveats] as Tuples), opts)
//     }

// footers are unstructed/client blobs to the server
const addFooters = (
  issuer:PromiseOR<string>,
  secret:PromiseOR<string>,
  initalCond: Dict<string> = {},
  opts: IOptions) =>
  (addFooters:Dict<string>) => {
    return create(issuer, secret, initalCond, { ...opts, footers: { ...opts.footers, ...addFooters } })
  }

// heders are structred metadata
const addHeaders = (
  issuer:PromiseOR<string>,
  secret:PromiseOR<string>,
  initalCond: Dict<string> = {},
  opts: IOptions) => (addHeaders:IHeaders) => {
  return create(issuer, secret, initalCond, { ...opts, headers: { ...opts.headers, ...addHeaders } })
}
// #endregion chainingAdders

// #region validators
const isValid = (
  issuer:PromiseOR<string>,
  secret:PromiseOR<string>,
  initalCond: Dict<string> = {},
  opts: IOptions) => async () => {
  return true
}
const ensureValid = (
  issuer:PromiseOR<string>,
  secret:PromiseOR<string>,
  initalCond: Dict<string> = {},
  opts: IOptions) => async () => {
  // no return
}
// #endregion validators

// #region serializers/exporters

const toObject = (
  issuer:PromiseOR<string>,
  secret:PromiseOR<string>,
  initalCond: Dict<string> = {},
  opts: IOptions) =>
  async () => {
    const body = { ...initalCond }
    const sig = await makeFinalSignature(secret, initalCond)
    const { headers, footers } = opts
    return {
      headers: headers as unknown as Dict<string>,
      body,
      footers,
      sig
    }
  }

const toJSON = (
  issuer:PromiseOR<string>,
  secret:PromiseOR<string>,
  initalCond: Dict<string> = {},
  opts: IOptions) => async () => {
  return JSON.stringify(create(issuer, secret, initalCond, opts).toObject())
}

const toBase64 = (
  issuer:PromiseOR<string>,
  secret:PromiseOR<string>,
  initalCond: Dict<string> = {},
  opts: IOptions) =>
  async () => {
    // <sig>.<header>.<body>.<footer>
    // ALL footer is ignored by issuer
    //
    // set header.enc to 'br' if it does get compressed
    // issuer the first constraint
    // colon sep terms
    // term:value (newline)

    const { sig, body, footers, headers } = await toObject(issuer, secret, initalCond, opts)()

    console.log({ headers, body, sig, footers })

    const hdrs = atob(
      Object.entries(headers)
        .reduce((p, [k, v]) => `${p}\n${k}:${v}`, '')
    )

    const b = atob(
      Object.entries(body)
        .reduce((p, [k, v]) => `${p}\n${k}:${v}`, '')
    )

    const f = atob(
      Object.entries(footers)
        .reduce((p, [k, v]) => `${p}\n${k}:${v}`, '')
    )

    return `${
            hdrs
        }.${
            b.length > opts.cfg.compressAfter
                ? await promisify(brotliCompress)(b)
                : b
        }.${
            sig
        }.${
            f
        }`
  }

const toURL = (
  issuer: PromiseOR<string>,
  secret: PromiseOR<string>,
  initalCond: Dict<string> = {},
  opts: IOptions) => async (param:string = 't') => {
  // set header.enc to 'br' if it does get compressed
  return new URL('')
}

const toFunction = (
  issuer:PromiseOR<string>,
  _:PromiseOR<string>,
  initalCond: Dict<string> = {},
  opts: IOptions) => {
  // set header.enc to 'br' if it does get compressed
  return async (secret: PromiseOR<string>, outputFmt?: 'base64' | 'url' | 'json') => {
    switch (outputFmt) {
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
const lastOf = <T>(arr:T[]) => arr.slice(-1)[0]

const getColumnOfSigs = async (secret:PromiseOR<string>, tupleData: Dict<string> = {}) => {
  const withSecretInRowZero = [[null, null, await secret], ...Object.entries(tupleData)]
    .map((c, i, a) => {
      return i === 0
        ? c // leave top row alone - since it will get pulled off
        : [...c,
          createHmac('sha384', lastOf((a as string[][])[i - 1]))
            .update(c.toString())
            .digest('base64')
        ] as string[]
    })
  return withSecretInRowZero.slice(1).map(v => lastOf(v))
}

const makeFinalSignature = async (secret:PromiseOR<string>, tupleData: Dict<string> = {}) => {
  // each row gets a sig - @see getColumnOfSigs , but to compute the final,
  // we omit saving out the intermediate sigs, and just roll them forward to the final'
  // similar to #getColumnOfSigs, every colum as a calculated sig,
  // and the sig from the row above, is the seed/secret for the current's row sig
  return Object.entries(tupleData)
    .reduce((p, [key, val]) => {
      return createHmac('sha384', p)
        .update(key.toString())
        .digest('base64')
    }, await secret)
}

// #endregion helpers

export const crumpetBakery = { create, fromBase64, fromJSON, fromURL }
export default crumpetBakery
