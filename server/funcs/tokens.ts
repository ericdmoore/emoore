/**
 * @todo clean up authToken with accessToken
 * @ref AccessToken is always based on your uacct/password
 * @ref AccessToken is always based on your uacct/password*
 */

import type { IFunc, SRet, Responder, NonNullObj } from '../types'
import type { IUser } from '../entities/users'

// import type { ValidationResp } from './validations'

import { accessToken, IAccessTokenData } from '../auths/tokens'
import baseHandle from '../utils/methodsHandler'
import validate from './validations'
import {
  pluckCredentialsFromEvent,
  // pluckStarterTokenFromEvent,
  pluckAuthTokenFromEvent,
  emailAddressShouldBeValid,
  // emailShouldBeProvided,
  // emailCredentialShouldMatchTheEmailInTheAuthToken,
  passShouldBeProvidedAndValid,
  authTokenShouldBeValid,
  authTokenShouldBeProvided,
  challengeTOTPShouldBeValid
} from '../validators/tokens'
import user from '../entities/users'
import { jsonResp, respSelector, CORSHeaderEntries } from '../utils/SRetFormat'
const compressableJson = respSelector(jsonResp)

// #region interfaces

export interface ILoginInfoInput{
    email: string | null
    p: string | null
    TFAchallengeResp: string
    TFAtype: 'TOTP' | 'U2F' | 'Backup' | string
}

export interface DelegationInput extends Required<ILoginInfoInput>{
  token:string
}

export interface IAuthzData{
  creds: ILoginInfoInput
  jwtUser?: IUser
}

export type IAuthzFlat = ILoginInfoInput & IUser & {email?: string}
export type IAuthzFlatPartial = Partial<IAuthzFlat>
export type IAuthzFlatRequired = Required<NonNullObj<IAuthzFlat>>

export type IUserPublic = Omit<
IUser,
 | 'backupCodes'
 | 'p'
 | 'pwHash'
 | 'oobTokens'
 | 'TFAchallengeResp'
 | 'TFAtype'
 | 'cts'
 | 'mts'
 | 'entity'
>

// #endregion interfaces

// pluickers

const hasAllCreds = (login : object): login is ILoginInfoInput => ['p', 'email', 'TFAtype', 'TFAchallengeResp'].every(key => key in login)
// const deleteCredentials = (login : object): login is DelegationInput => hasAllCreds(login) && 'token' in login

/**
 * Token
 * @param e
 * @param c
 */
export const validatedPOST:IFunc = async (e, c) => {
  const credsInputs = pluckCredentialsFromEvent(e)

  return validate(
    postFinalTokenResponder,
    { ...credsInputs } as IAuthzFlat,
    async () => {
      // has all of: email, p, TFAType, TFAchallengeResp
      return {
        code: 400,
        passed: hasAllCreds(credsInputs),
        reason: 'All Credentials Must be prodivded',
        InvalidDataLoc: '[H>Q>C].email, [H>Q>C].p, [H>Q>C].TFAtype, [H>Q>C].TFAchallengeResp',
        InvalidDataVal: JSON.stringify(credsInputs, null, 2)
      }
    },
    // emailShouldBeProvided,
    emailAddressShouldBeValid('user'),
    passShouldBeProvidedAndValid,
    challengeTOTPShouldBeValid
  )(e, c)
}

export const postFinalTokenResponder:Responder<unknown> = async (data, event, ctx, extras) => {
  const { backupCodes, pwHash, oobTokens, cts, mts, entity, ...usr } = extras.user as IUser
  // console.log({ funcUsr: extras.user })

  const credsInputs = pluckCredentialsFromEvent(event)
  if (credsInputs.TFAtype === 'Backup') {
    await user.otp.expireBackupCode(extras.user as IUser, credsInputs.TFAchallengeResp as string)
  }

  const { token } = await accessToken().create(usr)

  return {
    statusCode: 200,
    ...await compressableJson(
      {
        headers: CORSHeaderEntries,
        cookies: [`authToken=${token}`]
      }
    )(event,
      {
        authToken: token,
        user: usr as IUserPublic
      }
    )
  }
}

export const validatedGET:IFunc = async (e, c) => {
  const tokenStr = pluckAuthTokenFromEvent(e)
  // const creds = pluckCredentialsFromEvent(e)

  const rejector = validate(
    getResponder,
    {} as IAccessTokenData,
    authTokenShouldBeProvided,
    authTokenShouldBeValid
  )

  if (tokenStr) {
    const jwtUser = await accessToken()
      .fromString(tokenStr)
      .then(d => d.obj)
      .catch(er => undefined)
    if (jwtUser) {
      return validate(
        getResponder,
        jwtUser as IAccessTokenData,
        authTokenShouldBeProvided,
        authTokenShouldBeValid
      )(e, c)
    } else {
      return rejector(e, c)
    }
  } else {
    return rejector(e, c)
  }
}

export const getResponder:Responder<IAccessTokenData> = async (d, e, c) => {
  const { uacct, last25, email } = d
  const { token } = await accessToken().create({ uacct, email, last25 })

  return {
    statusCode: 200,
    ...await compressableJson({
      headers: CORSHeaderEntries,
      cookies: [`authToken=${token}`]
    })(e, {
      refreshedAuthToken: token,
      user: d,
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
export const get = validatedGET

/**
 * POST :: loginInfo -> starterToken -> (+2FA)-> token
 * StarterToken = token(email)
 * @param e Event from Gateway
 * @param e.[[headers][queryStringParameters][cookies]].email
 * @param e.[[headers][queryStringParameters][cookies]].p
 * @param e.[[headers][queryStringParameters][cookies]].TFAchallengeResp
 * @param e.[[headers][queryStringParameters][cookies]].TFAtype
 * @param c Context
 */
export const post = validatedPOST

/**
 * PUT :: token -> token
 * @param e Event from Gateway
 * @param e.[[headers][queryStringParameters][cookies]].authtoken
 * @param c Context
 */
export const put = validatedPOST

/**
 * DELE :: token -> confimationMessage
 * @param e Event from Gateway
 * @param e.[[headers][queryStringParameters][cookies]].authtoken
 * @param c Context
 */
export const dele = validatedPOST

export const handler:IFunc = baseHandle({ get, post, put, dele })
export default handler
