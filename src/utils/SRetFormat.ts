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
      'Content-Encoding': 'gzip' ,
      'Content-Length': body.length,
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
      'Content-Encoding': 'br',
      'Content-Length': body.length,
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

export const respSelector = <T extends string | object>(fmtInput:(i:T)=>Promise<NoStatusSRet>) => {
  // internal closure
  const acceptsEncClosure = (s:string, i:T):Promise<NoStatusSRet> => {
    switch (s) {
      case '*':
        // no-preference - we chose brotli
        return brotliP(fmtInput(i))
      case 'br':
        return brotliP(fmtInput(i))
      case 'gzip':
        return gzipP(fmtInput(i))
      case 'deflate':
        return deflateP(fmtInput(i))
      case 'identity':
        return fmtInput(i)
      default:
        break
    }

    if (s.includes(',')) {
      // one entry has a weighted option syntax
      return Promise.race(
        s.split(',')
          .map(enc => acceptsEncClosure(enc.split(';')[0], i))
      )
    } else {
      return fmtInput(i)
    }
  }

  return async (e:Evt, i:T) => {
    const acceptedArr = Object.entries(e.headers)
      .map(([k, v]) => [k.toLowerCase(), v])
      .filter(([k, _]) => k === 'accept-encoding')
      .map(([_, v]) => v)
      .filter(v => v) as string[]

    return JSON.stringify(i).length > 860 && acceptedArr.length >= 1
      ? acceptsEncClosure(acceptedArr[0], i)
      : fmtInput(i)
  }
}

// #region application payload formatter

export const jsonLDResp = async (i:{doc:JsonLdDocument, ctx:ContextDefinition}): Promise<NoStatusSRet> => {
  const body = JSON.stringify(await flatten(await compact(i.doc, i.ctx)))
  return {
  headers: { 
    'Content-Type': 'applciation/ld+json',
    'Content-Length': body.length
  },
  body,
  isBase64Encoded: false,
  cookies: []
}}

export const jsonResp = async (bodyInput:object): Promise<NoStatusSRet> => {
  const body = JSON.stringify(bodyInput)
  return {
  headers: { 
    'Content-Type': 'applciation/json' ,
    'Content-Length': body.length
  },
  body,
  isBase64Encoded: false,
  cookies: []
  }
}

export const htmlResp = async (html:string): Promise<NoStatusSRet> => {
  return {
  headers: { 
    'Content-Type': 'text/html',
    'Content-Length': html.length
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
      'Content-length': body.length
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
