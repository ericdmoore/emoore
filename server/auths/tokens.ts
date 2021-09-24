import type { JWTelementsExtras } from '../types'
import jwt from 'jsonwebtoken'

import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { stat } from 'fs/promises'
import { resolve } from 'path'

// #region interfaces

interface TokenOutput<T>{
  obj: T
  token: string
  headers: JWTelementsExtras
}

interface ITokenStart<T> {
  create: (obj:T)=>Promise<TokenOutput<T>>
  isVerified: (inputToken:string)=>Promise<boolean>
  fromString: (token:string)=>Promise<TokenOutput<T>>
}

export interface IAccessTokenData extends JWTelementsExtras{
    uacct: string
    email: string
    last25: string[]
}

export interface IAcceptanceTokenData extends JWTelementsExtras{
    email: string
    displayName: string
    passwordPlainText: string
    uacct?: string
}

interface TypedVerifiedToken<T> {
    header: JWTelementsExtras
    payload: JWTelementsExtras & T
    signature: string
  }

// type JSONtypes = number | string | null | JSONtypes[] | {[key:string]: JSONtypes}

// interface VerifiedToken {
//   header: JWTelementsExtras
//   paylaod: JWTelementsExtras & {[key:string]: JSONtypes}
//   signature: string
// }

const FILEPATH = resolve(__dirname, '../../cloud/.env')
const envConfig = dotenv.config({ path: FILEPATH }).parsed

export const JWT_SECRET = process.env.JWT_SECRET ?? envConfig?.JWT_SECRET as string
export const JWT_SECRET_ID = process.env.JWT_SECRET_ID ?? envConfig?.JWT_SECRET_ID as string
export const ISSUER = 'co.federa'

export const jwtVerify = <OutputType extends JWTelementsExtras>(secretOrPublicKey: jwt.Secret | jwt.GetPublicKeyOrSecret = JWT_SECRET) =>
  (token: string | undefined, opts?: jwt.VerifyOptions) : Promise<OutputType> =>
    new Promise((resolve, reject) => {
      if (!token) {
        reject(new Error('missing token for verification'))
      } else {
        jwt.verify(token, secretOrPublicKey, { complete: true, ...opts }, (er, obj) =>
          er
            ? reject(er)
            : resolve(obj as unknown as OutputType)
        )
      }
    })

export const jwtSign = <InputType extends object>(secretOrPrivateKey: jwt.Secret = JWT_SECRET) =>
  (payload: InputType, opts?: jwt.SignOptions): Promise<string> =>
    new Promise((resolve, reject) => {
      const defaultOpts:jwt.SignOptions = { issuer: ISSUER, expiresIn: 3600 * 24, keyid: JWT_SECRET_ID }
      jwt.sign(payload as InputType, secretOrPrivateKey, { ...defaultOpts, ...opts }, (er, obj) => {
        if (er) { reject(er) } else { resolve(obj as string) }
      })
    })

export const accessToken = (jwtSecret = JWT_SECRET) :ITokenStart<IAccessTokenData> => {
  const create = async (obj:IAccessTokenData, opts?:jwt.SignOptions) => {
    const token = await jwtSign(jwtSecret)(obj, opts)
    const tokObj = await jwtVerify(jwtSecret)(token) as unknown as TypedVerifiedToken<IAccessTokenData>
    const {
      alg, // algorithm
      typ, // type
      kid // key id
    } = tokObj.header

    const {
      iat, // issued at
      exp, // expires
      iss, // issuer
      sub, // subject
      aud, // audience
      nbf, // not before
      jti, // JWT ID
      ...objData
    } = tokObj.payload

    // console.log({tokObj})
    return Object.freeze({ token, obj: objData, headers: { alg, typ, kid, iat, exp, iss, sub, aud, nbf, jti } as JWTelementsExtras })
  }
  const fromString = async (token:string) => {
    const tokObj = await jwtVerify(jwtSecret)(token)
      .catch(er => { throw Error('Access Token Could Not Be Verfied') }) as unknown as TypedVerifiedToken<IAccessTokenData>

    // pluck out
    const { iat, exp, iss, ...objData } = tokObj.payload

    return !objData?.uacct
      ? Promise.reject(Error('AccessToken does not have a UACCT'))
      : create(objData)
  }
  const isVerified = async (tokenStr:string, match:{iss:string, useDate: number} = { iss: ISSUER, useDate: Date.now() }) => {
    const tokObj = await jwtVerify<IAccessTokenData>()(tokenStr)
      .catch(er => { throw Error('Access Token Could Not Be Verfied') }) as unknown as TypedVerifiedToken<IAccessTokenData>
    const { iss, iat, exp, ...obj } = tokObj.payload
    return !!obj && iss === match.iss
  }
  return { create, isVerified, fromString }
}

export const acceptanceToken = (jwtSecret = JWT_SECRET) :ITokenStart<IAcceptanceTokenData> => {
  const create = async (obj:IAcceptanceTokenData, opts?:jwt.SignOptions) => {
    const token = await jwtSign(jwtSecret)(obj, opts)
    const tokObj = await jwtVerify(jwtSecret)(token) as unknown as TypedVerifiedToken<IAcceptanceTokenData>

    const { alg, typ, kid } = tokObj.header
    const { iat, exp, iss, sub, aud, nbf, jti, ...objData } = tokObj.payload

    return Object.freeze({
      token,
      obj: objData,
      headers: { alg, typ, kid, iat, exp, iss, sub, aud, nbf, jti } as JWTelementsExtras
    })
  }
  const isVerified = async (tokenStr:string, match:{iss:string, useDate: number} = { iss: ISSUER, useDate: Date.now() }) => {
    const tokObj = await jwtVerify(jwtSecret)(tokenStr)
      .catch(er => { Promise.reject(Error('Access Token Could Not Be Verfied')) }) as unknown as TypedVerifiedToken<IAcceptanceTokenData>
    const { iss, iat, exp, ...obj } = tokObj.payload
    return !!obj && iss === match.iss
  }

  const fromString = async (token:string) => {
    const tokObj = await jwtVerify<IAcceptanceTokenData>(jwtSecret)(token).catch(er => null) as TypedVerifiedToken<IAcceptanceTokenData> | null

    if (tokObj) {
      // pluck out
      const { iat, exp, iss, ...objData } = tokObj.payload
      return ['email', 'displayName', 'passwordPlainText'].every(key => key in objData)
        ? create(objData)
        : Promise.reject(Error('AcceptanceTokens MUST have fields:"[email, displayName, passwordPlainText]"'))
    } else {
      return Promise.reject(Error('Access Token Could Not Be Verfied'))
    }
  }

  return { create, isVerified, fromString }
}

export default accessToken
