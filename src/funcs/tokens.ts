import type { IFunc, SRet, Evt, Responder } from '../types'
import type { IUser } from '../entities/users'
// import { createHmac } from 'crypto'
// import { btoa } from '../utils/base64'
import baseHandle from './common'
import validate from './validations'
import first from '../utils/first'
import pluckDataFor from '../utils/pluckData'
import { user } from '../entities'
import { jwtSign, jwtVerify } from '../auths/validJWT'

import {
  emailAddressInvalid,
  emailNotProvided,
  sigNotProvided,
  sigInvalid,
  authTokenInvalid,
  authTokenNotProvided
} from '../validators/tokens'

// import { user } from '../entities'
// import { getJWTobject } from '../auths/validJWT'
// import JSON5 from 'json5'
// import { HttpStatusCode } from '../enums/HTTPstatusCodes'

// #region interfaces

export interface ILoginInfoInput{
    email: string | null
    TFAtype?: 'TOTP' | 'U2F' | string
    TFAchallengeResp?: string
    sig: string | null
}

export interface authZData{
  creds: ILoginInfoInput
  jwtUser: IUser & {email: string}
  tokenStr: string
}

// #endregion interfaces

// pluickers

// eslint-disable-next-line no-unused-vars
const pluckAuthTokenFromEvent = (e:Evt) => first(
  [
    pluckDataFor('AuthorizationToken'),
    pluckDataFor('authorizationToken'),
    pluckDataFor('authToken'),
    pluckDataFor('authtoken'),
    pluckDataFor('auth'),
    pluckDataFor('token')
  ].map(f => f(e, undefined))
)

/**
 *
 * @param e
 */
export const pluckCredentialsFromEvent = (e:Evt): ILoginInfoInput => ({
  email: pluckDataFor('email')(e, null),
  sig: pluckDataFor('sig')(e, null),
  TFAtype: pluckDataFor('TFAtype')(e, undefined),
  TFAchallengeResp: pluckDataFor('TFAchallengeResp')(e, undefined)
})

// const makeSig = (creds:ILoginInfoInput, password: string):string =>
//   createHmac('sha256', password)
//     .update(JSON.stringify(creds, Object.keys(creds).sort()))
//     .digest('hex')

// const isSigValid = (creds:ILoginInfoInput, base64password: string):boolean => {
//   return creds.sig === null || creds.email == null
//     ? false
//     : creds.sig === makeSig(creds, btoa(base64password))
// }

/**
 * @note Why use a thunk? I dont see the design pattern yet, feels like premature optim
 * @param e
 */
// const findGrantedAuthzForUserfromEvent = async (e:Evt) => ({})

export const postResponser:Responder<authZData> = async (data, event, ctx) => {
  const jwtUser = data.jwtUser
  const authToken = await jwtSign()({ email: jwtUser.email, uacct: jwtUser.uacct, maxl25: jwtUser.maxl25 })
  return {
    statusCode: 200,
    isBase64Encoded: false,
    cookies: [`authToken=${authToken}`],
    body: JSON.stringify({ authToken, jwtUser })
  } as SRet
}

/**
 * Token
 * @param e
 * @param ctx
 */
export const validatedPOST:IFunc = async (e, ctx) => {
  const tokenStr = pluckAuthTokenFromEvent(e)
  const jwtUser = await jwtVerify()(tokenStr).then(async jwtOb => {
    return {
      ...jwtOb,
      ...(await user.lookupVia({ typeID: 'email', exID: jwtOb.email }))
    }
  })

  const auzhZData: authZData = {
    tokenStr: tokenStr ?? '',
    jwtUser,
    creds: pluckCredentialsFromEvent(e)
  }

  return validate(
    postResponser,
    auzhZData,
    emailNotProvided,
    sigNotProvided,
    emailAddressInvalid,
    sigInvalid
  )(e, ctx)
}

export const getRespoder:Responder<authZData> = async (authZData, e, c) => {
  const { jwtUser } = authZData
  const nextAuthToken = await jwtSign()({
    uacct: jwtUser.uacct,
    email: jwtUser.email,
    maxl25: jwtUser.maxl25
  })
  return {
    statusCode: 200,
    isBase64Encoded: false,
    cookies: [`authToken=${nextAuthToken}`],
    body: JSON.stringify({
      authToken: nextAuthToken,
      delegationStarterTokens: [], // I am a helper for these accounts, and they can revoke my access
      revocableDelegateStarterTokens: [] // I have these helpers for my account
    })
  } as SRet
}

export const validatedGET:IFunc = async (e, c) => {
  const tokenStr = pluckAuthTokenFromEvent(e)
  const jwtUser = await jwtVerify()(tokenStr).then(async jwtOb => {
    return {
      ...jwtOb,
      ...(await user.lookupVia({ typeID: 'email', exID: jwtOb.email }))
    }
  })

  const auzhZData: authZData = {
    tokenStr: tokenStr ?? '',
    jwtUser,
    creds: pluckCredentialsFromEvent(e)
  }

  return validate(
    getRespoder, auzhZData,
    authTokenNotProvided,
    authTokenInvalid
  )(e, c)
}

/**
 * GET :: token -> tokens
 * @param e Event from Gateway
 * @param e.[[headers][queryStringParameters][cookies]].authtoken
 * @param c Context
 */
export const get: IFunc = async (e, c) => validatedGET(e, c)

/**
 * POST :: loginInfo -> starterToken -> (+2FA)-> token
 * @param e Event from Gateway
 * @param e.[[headers][queryStringParameters][cookies]].email
 * @param e.[[headers][queryStringParameters][cookies]].TFAchallengeResp
 * @param e.[[headers][queryStringParameters][cookies]].TFAtype
 * @param e.[[headers][queryStringParameters][cookies]].sig
 * @param c Context
 */
export const post: IFunc = async (e, c) => validatedPOST(e, c)

/**
 * PUT :: token -> token
 * @param e Event from Gateway
 * @param e.[[headers][queryStringParameters][cookies]].authtoken
 * @param c Context
 */
export const put: IFunc = async (e, c) => validatedPOST(e, c)

/**
 * DELE :: token -> confimationMessage
 * @param e Event from Gateway
 * @param e.[[headers][queryStringParameters][cookies]].authtoken
 * @param c Context
 */
export const dele: IFunc = async (e, c) => validatedPOST(e, c)

export const handler:IFunc = baseHandle({ get, post, put, dele })
export default handler
