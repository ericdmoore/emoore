import type { IFunc, SRet, Responder, JWTObject, NonNullObj } from '../types'
import type { IUser } from '../entities/users'
import type { ValidationResp } from './validations'

import { user } from '../entities'
import { jwtSign, jwtVerify } from '../auths/validJWT'
import baseHandle from './common'
import validate from './validations'
import {
  pluckCredentialsFromEvent,
  pluckAuthTokenFromEvent,
  emailAddressInvalid,
  emailNotProvided,
  passIsProvidedAndValid,
  authTokenInvalid,
  authTokenNotProvided,
  isTOTPChallengeValid
} from '../validators/tokens'

// #region interfaces

export interface ILoginInfoInput{
    email: string | null
    p: string | null
    TFAtype?: 'TOTP' | 'U2F' | string
    TFAchallengeResp?: string
}

export interface IAuthzData{
  creds: ILoginInfoInput
  jwtUser?: IUser
}

export type IAuthzFlat = ILoginInfoInput & IUser
export type IAuthzFlatPartial = Partial<IAuthzFlat>
export type IAuthzFlatRequired = Required<NonNullObj<IAuthzFlat>>

// #endregion interfaces

// pluickers

/**
 * Token
 * @param e
 * @param c
 */
export const validatedPOST:IFunc = async (e, c) => {
  // 2 INPUT MODES: statertoken || loginInfo
  const tokenStr = pluckAuthTokenFromEvent(e)
  const creds = pluckCredentialsFromEvent(e)

  if (tokenStr) {
    const jwtUser = await jwtVerify()(tokenStr)
      .then(async jwtOb => {
        return {
          ...jwtOb,
          ...(await user.lookupVia({ typeID: 'email', exID: jwtOb.email }))
        }
      }).catch(er => undefined)

    return validate(
      postFinalTokenResponder,
      { ...jwtUser, ...creds } as IAuthzFlat,
      passIsProvidedAndValid,
      isTOTPChallengeValid
    )(e, c)
  } else if (creds.email) {
    // only given login info
    const credUser = await user.lookupVia({ typeID: 'email', exID: creds.email })

    return validate(
      postStarterTokenResponder,
      { ...creds, ...credUser } as IAuthzFlat,
      passIsProvidedAndValid,
      emailNotProvided,
      emailAddressInvalid
    )(e, c)
  } else {
    // instead of validating everything missing case HERE IN the validated fetcher - pass the job down into validate - work through the
    return {
      statusCode: 400,
      isBase64Encoded: false,
      body: JSON.stringify({
        errors: [{
          code: 400,
          reason: 'Email ',
          InvalidDataVal: '',
          InvalidDataLoc: '',
          docRef: ''
        } as Omit<ValidationResp, 'passed'>]
      })
    } as SRet
  }
}

export const validatedGET:IFunc = async (e, c) => {
  const tokenStr = pluckAuthTokenFromEvent(e)
  const creds = pluckCredentialsFromEvent(e)

  const jwtUser = await jwtVerify()(tokenStr)
    .then(async (jwtOb: JWTObject) =>
      jwtOb.uacct
        ? await user.getByID(jwtOb.uacct)
        : await user.lookupVia({ typeID: 'email', exID: creds.email ?? '' })
    )
    // .catch(er => undefined)
    // has to be caught in the validation steps

  const auzhZData: IAuthzFlat = {
    ...jwtUser,
    ...pluckCredentialsFromEvent(e)
  }

  return validate(
    getResponder,
    auzhZData,
    authTokenNotProvided,
    authTokenInvalid
  )(e, c)
}

export const postFinalTokenResponder:Responder<IAuthzFlatRequired> = async (data, event, ctx) => {
  const { email, p, TFAtype, TFAchallengeResp, ...user } = data
  const authToken = await jwtSign()({ email, uacct: user.uacct, maxl25: user.maxl25 })
  return {
    statusCode: 200,
    isBase64Encoded: false,
    cookies: [`authToken=${authToken}`],
    body: JSON.stringify({ authToken, user })
  } as SRet
}

export const postStarterTokenResponder:Responder<IAuthzFlatRequired> = async (data, event, ctx) => {
  const { email } = data
  const starterToken = await jwtSign()({
    email,
    uacct: data.uacct,
    maxl25: []
  })
  return {
    statusCode: 200,
    isBase64Encoded: false,
    cookies: [`starterToken=${starterToken}`],
    body: JSON.stringify({ starterToken })
  } as SRet
}

export const getResponder:Responder<IAuthzFlatRequired> = async (d, e, c) => {
  const { email, p, TFAtype, TFAchallengeResp, ...usr } = d
  const nextAuthToken = await jwtSign()({
    uacct: d.uacct,
    email: d.email,
    maxl25: d.maxl25
  })
  return {
    statusCode: 200,
    isBase64Encoded: false,
    cookies: [`authToken=${nextAuthToken}`],
    body: JSON.stringify({
      refreshedAuthToken: nextAuthToken,
      user: usr,
      delegationStarterTokens: [], // I am a helper for these accounts, and they can revoke my access
      revocableDelegateStarterTokens: [] // I have these helpers for my account
    })
  } as SRet
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
 * StarterToken = token(email)
 * FinalToken = StarterToken + H>Q>C(TFAType + TFAchallengeResp + sig)
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
