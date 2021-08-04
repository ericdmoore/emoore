import type { Evt, SRet } from '../types'
import type { JsonLdDocument, ContextDefinition } from 'jsonld'
import { gzip, brotliCompress, deflate } from 'zlib'
import { compact, flatten } from 'jsonld'
import { lookup } from 'mime'

type PromiseOr<T> = Promise<T> | T
type NoStatusSRet = Omit<Required<SRet>, 'statusCode'>

// #region helpers
const _gzipP = (input: string):Promise<Buffer> => new Promise((resolve, reject) => {
  gzip(Buffer.from(input), (er, d) => er ? reject(er) : resolve(d))
})

const _brotliP = (input: string):Promise<Buffer> => new Promise((resolve, reject) => {
  brotliCompress(Buffer.from(input), (er, d) => er ? reject(er) : resolve(d))
})

const _deflateP = (input:string):Promise<Buffer> => new Promise((resolve, reject) => {
  deflate(Buffer.from(input), (er, d) => er ? reject(er) : resolve(d))
})
// #endregion helpers

// #region compasbale-compressors

const gzipP = async (i:PromiseOr<NoStatusSRet>):Promise<NoStatusSRet> => {
  i = await i
  const body = (await _gzipP(i.body)).toString('base64')
  return {
    ...i,
    headers: { ...i.headers, 
      'Content-Encoding': 'gzip',
      'Content-Length': body.length
    },
    body,
    isBase64Encoded: true
  }
}

const deflateP = async (i:PromiseOr<NoStatusSRet>):Promise<NoStatusSRet> => {
  i = await i
  const body = (await _deflateP(i.body)).toString('base64')
  return {
    ...i,
    headers: { ...i.headers, 
      'Content-Encoding': 'deflate',
      'Content-Length': body.length
    },
    body,
    isBase64Encoded: true
  }
}

const brotliP = async (i:PromiseOr<NoStatusSRet>):Promise<NoStatusSRet> => {
  i = await i
  const body = (await _brotliP(i.body)).toString('base64')
  return {
    ...i,
    headers: { ...i.headers, 
      'Content-Encoding': 'br',
      'Content-Length': body.length,
    },
    body,
    isBase64Encoded: true
  }
}

// #endregion compasbale-compressors

export const respSelector = <T extends string | object>(fmtBody:(i:T)=>Promise<NoStatusSRet>, characterThreshold = 800) => 
( defaultReturnValue:Partial<NoStatusSRet> = 
    { headers: {
      'Access-Control-Allow-Origin':'*',
      'Access-Control-Allow-Credentials': true
    } }
  ) => {
  // internal closure
  const acceptsEncClosure = async (s:string, i:T):Promise<NoStatusSRet> => {
    switch (s) {
      case '*':
        // no-preference - we chose brotli
        return {...defaultReturnValue, ...await brotliP(fmtBody(i))}
      case 'br':
        return {...defaultReturnValue, ...await brotliP(fmtBody(i))}
      case 'gzip':
        return {...defaultReturnValue, ...await gzipP(fmtBody(i))}
      case 'deflate':
        return {...defaultReturnValue, ...await deflateP(fmtBody(i))}
      case 'identity':
        return {...defaultReturnValue, ...await fmtBody(i)}
      default:
        // found an odd Encoding ID string
        // likley a compoud/weighted encoding string
        break
    }

    if (s.includes(',')) {
      // one entry has a weighted option syntax
      return Promise.race(
        s.split(',')
          .map(enc => acceptsEncClosure(
            enc.split(';')[0], // looking for key/head not the tail/value
            i
          ))
      )
    } else {
      return {...defaultReturnValue, ...await fmtBody(i)}
    }
  }

  return async (e:Evt, body:T) => {
    // look for headers including 'accept-encoding'
    // except nevermind with upper/lower casing
    const acceptedArr = Object.entries(e.headers)
      .map(([k, v]) => [k.toLowerCase(), v])
      .filter(([k, _]) => k === 'accept-encoding')
      .map(([_, v]) => v)
      .filter(v => v) as string[]

    return JSON.stringify(body).length > characterThreshold && acceptedArr.length >= 1
      // choose the first 
      // since its only possible to have multiple if the request mixes upper/lower casing of accept-encoding
      ? acceptsEncClosure(acceptedArr[0], body)
      : fmtBody(body)
  }
}

// #region application payload formatter

export const jsonLDResp = async (i:{doc:JsonLdDocument, ctx:ContextDefinition}): Promise<NoStatusSRet> => {
  const body = JSON.stringify(await flatten(await compact(i.doc, i.ctx)))
  return {
  headers: { 
    'Content-Length': body.length,
    'Content-Type': 'applciation/ld+json',
  },
  body,
  isBase64Encoded: false,
  cookies: []
}}

export const jsonResp = async (bodyInput:object): Promise<NoStatusSRet> => {
  const body = JSON.stringify(bodyInput)
  return {
  headers: { 
    'Content-Length': body.length,
    'Content-Type': 'applciation/json' ,
  },
  body,
  isBase64Encoded: false,
  cookies: []
  }
}

export const htmlResp = async (html:string): Promise<NoStatusSRet> => {
  return {
  headers: { 
    'Content-Length': html.length,
    'Content-Type': 'text/html'
  },
  body: html,
  isBase64Encoded: false,
  cookies: []
}}

export const textResp = async (text:string): Promise<NoStatusSRet> => {
  return {
  headers: { 
    'Content-Type': 'text', 
    'Content-Length': text.length
  },
  body: text,
  isBase64Encoded: false,
  cookies: []
}}

export const imgResp = async (i:Buffer, ext:string): Promise<NoStatusSRet> => {
  const body = Buffer.from(i).toString('base64')
  return {
    headers: { 
      'Content-Type': lookup(ext) ,
      'Content-length': body.length,
    },
    body,
    isBase64Encoded: true,
    cookies: []
  }
}

export const jsonGzResp = async (body:any) => gzipP(jsonResp(body))
export const jsonBrResp = async (body:any) => brotliP(jsonResp(body))
export const jsonDeflate = async (body:any) => deflateP(jsonResp(body))

export const jsonLDBrResp = async (i:{doc:JsonLdDocument, ctx:ContextDefinition}) => brotliP(jsonLDResp(i))
export const jsonLDGzipResp = async (i:{doc:JsonLdDocument, ctx:ContextDefinition}) => gzipP(jsonLDResp(i))

// #endregion application payload formatter

// @ref https://developer.mozilla.org/en-US/docs/Glossary/Response_header
