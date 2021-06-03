import type { IFunc, SRet, Responder, JWTObjectInput, NonNullObj } from '../types'
import type { IUser } from '../entities/users'
// import type { ValidationResp } from './validations'

import { user } from '../entities'
import { jwtSign, jwtVerify } from '../auths/validJWT'
import baseHandle from '../utils/methodsHandler'
import validate from './validations'
import {
  pluckCredentialsFromEvent,
  pluckAuthTokenFromEvent,
  emailAddressShouldBeValid,
  emailShouldBeProvided,
  passShouldBeProvidedAndValid,
  authTokenShouldBeValid,
  authTokenShouldBeProvided,
  challengeTOTPShouldBeValid
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

export type IAuthzFlat = ILoginInfoInput & IUser & {email?: string}
export type IAuthzFlatPartial = Partial<IAuthzFlat>
export type IAuthzFlatRequired = Required<NonNullObj<IAuthzFlat>>

// #endregion interfaces

// pluickers

const hasAllCreds = (login:ILoginInfoInput) => [
  !!login?.email,
  !!login?.p,
  !!login?.TFAtype,
  !!login?.TFAchallengeResp
].every(truthyCondition => truthyCondition)

/*

AllCreds = complete token
AllCreds + ?authToken = complete token
email, p = starter token

*/

const sign = jwtSign()

/**
 * Token
 * @param e
 * @param c
 */
export const validatedPOST:IFunc = async (e, c) => {
  // 2 INPUT MODES: statertoken || loginInfo
  const tokenStr = pluckAuthTokenFromEvent(e)
  const credsInputs = pluckCredentialsFromEvent(e)

  // console.log(0, { tokenStr, credsInputs })

  if (hasAllCreds(credsInputs)) {
    // console.log(1, 'validated POST: has all login Info')

    const credUser = await user.lookupVia({
      typeID: 'email',
      exID: credsInputs?.email ?? '_missing_'
    })

    let maxl25:string[] = []
    // token data beats creds
    if (tokenStr) {
      const jwtUser = await jwtVerify()(tokenStr).then(u => { maxl25 = u.maxl25; return u })
      if (credUser && jwtUser.email) {
        credUser.email = jwtUser.email
      }
      if (credUser && jwtUser.uacct) {
        credUser.uacct = jwtUser.uacct
      }
    }

    return validate(
      postFinalTokenResponder,
      { ...credsInputs, ...credUser, maxl25 } as IAuthzFlat,
      emailShouldBeProvided,
      emailAddressShouldBeValid,
      passShouldBeProvidedAndValid,
      challengeTOTPShouldBeValid
    )(e, c)
  } else if (credsInputs.email) {
    // only given partial login info
    // console.log(2, 'validated POST: has email')

    const credUser = await user.lookupVia({
      typeID: 'email',
      exID: credsInputs.email
    })

    return validate(
      postStarterTokenResponder,
      { ...credsInputs, ...credUser } as IAuthzFlat,
      emailShouldBeProvided,
      emailAddressShouldBeValid,
      passShouldBeProvidedAndValid
    )(e, c)
  } else {
    // console.log(3, 'validated POST base case')
    return validate(
      postStarterTokenResponder,
      { ...credsInputs } as IAuthzFlat,
      emailShouldBeProvided,
      emailAddressShouldBeValid,
      passShouldBeProvidedAndValid
    )(e, c)
  }
}

export const validatedGET:IFunc = async (e, c) => {
  const tokenStr = pluckAuthTokenFromEvent(e)
  const creds = pluckCredentialsFromEvent(e)

  const jwtUser = await jwtVerify()(tokenStr)
    .then(async (jwtOb: JWTObjectInput) =>
      jwtOb.uacct
        ? await user.getByID(jwtOb.uacct)
        : await user.lookupVia({ typeID: 'email', exID: creds.email })
    ).catch(er => undefined)

  // console.log('1.validateGET', { jwtUser, creds })

  const auzhZData = {
    ...pluckCredentialsFromEvent(e),
    ...jwtUser
  } as IAuthzFlat

  return validate(
    getResponder,
    auzhZData,
    authTokenShouldBeProvided,
    authTokenShouldBeValid
  )(e, c)
}

export const postFinalTokenResponder:Responder<IAuthzFlatRequired> = async (data, event, ctx) => {
  const { email, uacct, maxl25 } = data
  const { backupCodes, p, pwHash, oobTokens, TFAchallengeResp, TFAtype, ...usr } = data
  const authToken = await sign({ email, uacct, maxl25 })
  return {
    statusCode: 200,
    isBase64Encoded: false,
    cookies: [`authToken=${authToken}`],
    body: JSON.stringify({ authToken, user: usr })
  } as SRet
}

export const postStarterTokenResponder:Responder<IAuthzFlatRequired> = async (data, event, ctx) => {
  const { email, uacct } = data
  const starterToken = await sign({ email, uacct, maxl25: [] })
  return {
    statusCode: 200,
    isBase64Encoded: false,
    cookies: [`starterToken=${starterToken}`],
    body: JSON.stringify({ starterToken })
  } as SRet
}

export const getResponder:Responder<IAuthzFlatRequired> = async (d, e, c) => {
  const { uacct, maxl25, email, p, TFAtype, TFAchallengeResp, backupCodes, pwHash, oobTokens, ...usr } = d

  // console.log(0, { data: d })

  const nextAuthToken = await sign({ uacct, email, maxl25 })
  return {
    statusCode: 200,
    isBase64Encoded: false,
    cookies: [`authToken=${nextAuthToken}`],
    body: JSON.stringify({
      refreshedAuthToken: nextAuthToken,
      user: { ...usr, uacct },
      delegateStarterTokens: [], // I am a helper for these accounts, and they can revoke my access
      revocableDelegationStarterTokens: [] // I have these helpers for my account
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
