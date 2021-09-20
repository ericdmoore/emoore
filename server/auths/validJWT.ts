import type { IFunc, JWTObjectInput, SRet, Evt, Ctx, JWTelementsExtras } from '../types'
import jwt from 'jsonwebtoken'
import HTTPStatusCodes from '../enums/HTTPstatusCodes'
// import first, { tryHead } from '../utils/first'
import { parse as dotenvparse } from 'dotenv'
import { readFileSync } from 'fs'
import { resolve } from 'path'
// import { pluckDataFor } from '../utils/pluckData'
import { pluckAuthTokenFromEvent } from '../validators/tokens'

// #region interfaces

interface TokenOutput<T>{
  obj: T
  token: string
  headers: JWTelementsExtras
}

// interface IAuthTokenInputs extends JWTelementsExtras{
//   behalfOfUacct: string
//   scopes: string[]
// }

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

// type JSONtypes = number | string | null | JSONtypes[] | {[key:string]: JSONtypes}

// interface VerifiedToken {
//   header: JWTelementsExtras
//   paylaod: JWTelementsExtras & {[key:string]: JSONtypes}
//   signature: string
// }

interface TypedVerifiedToken<T> {
  header: JWTelementsExtras
  payload: JWTelementsExtras & T
  signature: string
}

// #endregion interfaces

interface RequestRejection{
    reason: string
    message: string
    documentationRef: string
}
export type Rejector = (reasons:RequestRejection[]) => IFunc
export type Validator = (nextIfPass:IFunc) => IFunc

// #endregion interfaces

const envConfig = dotenvparse(readFileSync(resolve(__dirname, '../../cloud/.env')))
export const JWT_SECRET = process.env.JWT_SECRET ?? envConfig.JWT_SECRET as string
export const JWT_SECRET_ID = process.env.JWT_SECRET_ID ?? envConfig.JWT_SECRET_ID as string
export const ISSUER = 'co.federa'
// NEVER PRINT THESE

export const getJWTstrFromEventP = (event: Evt):Promise<string> => {
  return new Promise((resolve, reject) => {
    const jwtStr = pluckAuthTokenFromEvent(event)
    jwtStr
      ? resolve(jwtStr as string)
      : reject(new Error(`A JWT String Was Expected in the Event. 

      H = Headers
      Q = QueryString
      C = Cookies

      The Locations Checked - Top Locations are preferred [
        $request['H>Q>C].AuthorizationToken',
        $request['H>Q>C].authorizationToken',
        $request['H>Q>C].authToken',
        $request['H>Q>C].authtoken',
        $request['H>Q>C].auth',
        $request['H>Q>C].token
      ]`))
  })
}

export const getJWTobject = async (e:Evt): Promise<unknown> => jwtVerify(JWT_SECRET)(await getJWTstrFromEventP(e))

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

export const rejectReqForReason: Rejector = (reasons):IFunc => async (event, context) => ({
  statusCode: HTTPStatusCodes.FORBIDDEN,
  isBase64Encoded: false,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    statusCode: HTTPStatusCodes.FORBIDDEN,
    message: 'Request Rejected',
    reasons
  })
} as SRet)

export const validJWT: Validator = (validatedFn): IFunc => async (event:Evt, context:Ctx) => {
  const failureReasons: RequestRejection[] = []

  // prefers most specific & most formal
  // permits shorthand
  const token = await getJWTstrFromEventP(event).catch(() => {
    failureReasons.push({
      reason: 'Endpoint Requires an Authorization Token.',
      message: 'Provide an Authorization header/cookie/or queryString with a valid JWT',
      documentationRef: ''
    })
    return ''
  })

  const { next, nextToken } = await jwtVerify(JWT_SECRET)(token)
  // .then() for ensuring the right data
    .then((jwtObj) => Promise.all([validatedFn, jwtSign(JWT_SECRET)(jwtObj as unknown as JWTObjectInput)]))
    .then(([next, nextToken]) => ({ next, nextToken }) as {next:IFunc, nextToken:string})
    .catch(() => {
      failureReasons.push({ reason: 'Invalid Authorization Token.', message: 'Ensure the provided JWT is valid', documentationRef: '' })
      return { nextToken: 'REPLACE_WITH_A_VALID_TOKEN', next: rejectReqForReason(failureReasons) }
    })

  return next(event, { nextToken, ...context })
}

export const refreshToken = async <T extends JWTelementsExtras>(e:Evt):Promise<string> => {
  const authToken = pluckAuthTokenFromEvent(e)
  if (!authToken) {
    return Promise.reject(Error('Cannot refresh a missing authToken'))
  } else {
    const { iat, exp, ...obj } = await jwtVerify<T>()(authToken)
    return jwtSign()(obj as object)
  }
}

export const accessToken = (jwtSecret = JWT_SECRET) :ITokenStart<IAccessTokenData> => {
  const create = async (obj:IAccessTokenData, opts?:jwt.SignOptions) => {
    const token = await jwtSign(jwtSecret)(obj, opts)
    const tokObj = await jwtVerify<IAccessTokenData>(jwtSecret)(token) as unknown as TypedVerifiedToken<IAccessTokenData>
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

// export const authToken = ():ITokenStart<IAuthTokenInputs>=>{
//   const create = async (obj:IAuthTokenInputs)=>{
//     const token = await jwtSign()(obj)
//     return Object.freeze({ token, obj })
//   }

//   const fromString = async (token:string)=>{
//     const {iat, exp, iss, ...obj} = await jwtVerify<IAuthTokenInputs>()(token)
//       .catch(er=>{throw Error('AuthToken could not be Verifed')})

//     if(obj?.behalfOfUacct && obj?.scopes){
//       return create(obj)
//     }else{
//       return Promise.reject(Error(''))
//     }
//   }
//   const isVerified = async (tokenStr:string)=>{
//     return !!(await fromString(tokenStr).catch(er => false))
//   }
//   return {create, isVerified, fromString}
// }

export default validJWT
