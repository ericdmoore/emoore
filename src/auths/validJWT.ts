import type {
  // eslint-disable-next-line no-unused-vars
  APIGatewayProxyHandlerV2 as Func,
  // eslint-disable-next-line no-unused-vars
  APIGatewayProxyEventV2 as Event,
  APIGatewayEventRequestContext as Context,
  // eslint-disable-next-line no-unused-vars
  APIGatewayProxyResultV2 as Ret,
  // eslint-disable-next-line no-unused-vars
  APIGatewayProxyStructuredResultV2 as SRet
} from 'aws-lambda'

import type { JWTObject } from '../types'
import jwt from 'jsonwebtoken'
import HTTPStatusCodes from '../enums/HTTPstatusCodes'

// #region interfaces
export type IFuncRetValue = Promise<string | object | SRet| undefined>
export type IFunc = (event: Event, context: Context & {nextToken?: string}) => IFuncRetValue
interface RequestRejection{
    reason: string
    message: string
    documentationRef: string
}
export type Rejector = (reasons:RequestRejection[]) => IFunc
export type Validator = (nextIfPass:IFunc) => IFunc

// #endregion interfaces

export const tryHead = (s:string[]) => s.length > 0 ? s[0] : undefined
export const JWT_SECRET = process.env.JWT_SECRET as string
export const JWT_SECRET_ID = process.env.JWT_SECRET_ID as string

export const pluckJWTfromEvent = (event:Event) =>
  event.headers?.Token ??
  event.headers?.token ??
  event.queryStringParameters?.Token ??
  event.queryStringParameters?.token ??
  tryHead(jwtCookies(event.cookies))

const jwtCookies = (cookieArr:string[] = []) => cookieArr.filter(c => c.startsWith('Token=') || c.startsWith('token='))

export const getJWTstrFromEventP = (event: Event):Promise<string> => {
  return new Promise((resolve, reject) => {
    const jwtStr = pluckJWTfromEvent(event)
    jwtStr
      ? resolve(jwtStr as string)
      : reject(new Error(`A JWT String Was Expected in the Event. 

      The Locations Checked - Top Locations are preferred [
        $request.headers.Token,
        $request.headers.token,
        $request.queryString.Token,
        $request.queryString.token,
        $request.cookies.startsWith('Token=') ,
        $request.cookies.startsWith('token=') ,
      ]`))
  })
}

export const getJWTobject = async (e:Event): Promise<unknown> => {
  const token = await getJWTstrFromEventP(e)
  return jwtVerify(JWT_SECRET)(token)
}

export const jwtVerify = (secretOrPublicKey: jwt.Secret | jwt.GetPublicKeyOrSecret = JWT_SECRET) => (token: string, opts?: jwt.VerifyOptions):Promise<JWTObject> =>
  new Promise((resolve, reject) => {
    jwt.verify(token, secretOrPublicKey, opts, (er, obj) => {
      if (er) { reject(er) } else {
        resolve(obj as JWTObject)
      }
    })
  })

export const jwtSign = (secretOrPrivateKey: jwt.Secret = JWT_SECRET) => (payload: JWTObject, opts: jwt.SignOptions = { keyid: JWT_SECRET_ID }): Promise<string> =>
  new Promise((resolve, reject) => {
    const defaultOpts:jwt.SignOptions = { issuer: 'co.federa', expiresIn: 3600 * 24, keyid: JWT_SECRET_ID }
    jwt.sign(payload, secretOrPrivateKey, { ...defaultOpts, ...opts }, (er, obj) => {
      if (er) { reject(er) } else { resolve(obj as string) }
    })
  })

export const rejectReqForReason: Rejector = (reasons) => async (event, context) => ({
  statusCode: HTTPStatusCodes.FORBIDDEN,
  isBase64Encoded: false,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ statusCode: HTTPStatusCodes.FORBIDDEN, message: 'Request Rejected', reasons })
} as SRet)

export const validJWT: Validator = (validatedFn) => async (event:Event, context:Context) => {
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
    .then((jwtObj) => Promise.all([validatedFn, jwtSign(JWT_SECRET)(jwtObj)]))
    .then(([next, nextToken]) => ({ next, nextToken }) as {next:IFunc, nextToken:string})
    .catch(() => {
      failureReasons.push({ reason: 'Invalid Authorization Token.', message: 'Ensure the provided JWT is valid', documentationRef: '' })
      return { nextToken: 'REPLACE_WITH_A_VALID_TOKEN', next: rejectReqForReason(failureReasons) }
    })

  return next(event, { nextToken, ...context })
}

export default validJWT
