import type  {IFunc,JWTObjectInput, SRet, Evt, Ctx, JWTelementsExtras} from '../types'
import jwt from 'jsonwebtoken'
import HTTPStatusCodes from '../enums/HTTPstatusCodes'
import first, { tryHead } from '../utils/first'
import { parse as dotenvparse } from 'dotenv'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import {pluckDataFor} from '../utils/pluckData'
import { pluckAuthTokenFromEvent } from '../validators/tokens'

// #region interfaces

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
        jwt.verify(token, secretOrPublicKey, opts, (er, obj) =>
          er 
            ? reject(er) 
            : resolve(obj as unknown as OutputType)
        )
      }
    })

export const jwtSign = <InputType extends object>(secretOrPrivateKey: jwt.Secret = JWT_SECRET) => (payload: InputType, opts: jwt.SignOptions = { keyid: JWT_SECRET_ID }): Promise<string> =>
  new Promise((resolve, reject) => {
    const defaultOpts:jwt.SignOptions = { issuer: 'co.federa', expiresIn: 3600 * 24, keyid: JWT_SECRET_ID }
    jwt.sign(payload as InputType, secretOrPrivateKey, { ...defaultOpts, ...opts }, (er, obj) => {
      if (er) { reject(er) } else { resolve(obj as string) }
    })
  })

export const rejectReqForReason: Rejector = (reasons):IFunc => async (event, context) => ({
  statusCode: HTTPStatusCodes.FORBIDDEN,
  isBase64Encoded: false,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ statusCode: HTTPStatusCodes.FORBIDDEN, message: 'Request Rejected', reasons })
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
export const refreshToken = async <T extends JWTelementsExtras>(e:Evt):Promise<string> =>{
  const authToken = pluckAuthTokenFromEvent(e)
  if(!authToken){
    return Promise.reject(Error('Cannot refresh a missing authToken'))
  }else{
    const {iat, ...obj} = await jwtVerify<T>()(authToken)
    return jwtSign()( obj as object)
  }
}
export default validJWT
