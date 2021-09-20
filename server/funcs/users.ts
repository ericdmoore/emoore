/**
 * @author [Eric D Moore](https://ericdmoore.com)
 * @copyright All rights resvered © 2021
 * @license MIT
 */

import type { IFunc, SRet, Responder, JWTelementsExtras } from '../types'
// import type { IUser } from '../entities/users'
import { user, IUser } from '../entities'

import baseHandle from '../utils/methodsHandler'
import validate from './validations'
import {
  pluckAcceptanceToken,
  pluckUserSetupInfo,
  pluckUpdateFields,
  pluckDeleteFields,
  userShouldNotPrexist,
  hasAllRequiredFields,
  acceptanceTokenSigShouldMatchInlineInfo
} from '../validators/user'

import {
  // pluckAuthTokenFromEvent,
  authTokenShouldBeProvided,
  authTokenShouldBeValid,
  authTokenShouldContainValidUacct
} from '../validators/tokens'

// import { accessToken } from '../auths/validJWT'
import { jsonResp, respSelector } from '../utils/SRetFormat'

// #region interfaces
export interface IUserSetupInfo{
  email?: string
  plaintextPassword?: string
  displayName?: string
  uacct?: string
  auto?: boolean
}

export interface IAcceptanceTokenInput{
  uacct?: string
  email: string
  displayName: string
  plaintextPassword: string

}
export type IAcceptanceTokenOutput = JWTelementsExtras & IAcceptanceTokenInput
export type FlatPostUserInfo = IUserSetupInfo & {acceptanceTok?: string }
// #endregion interfaces

// #region helpers

// const verify = jwtVerify<JWTObjectOutput>()
const compressJsonBasedOnEvent = respSelector(jsonResp)

// #endregion helpers

// GET
const getResponder : Responder<{}> = async (d, e, c, sidecars) => {
  // console.log({ sidecars })
  const u = sidecars.validUacct as unknown as IUser

  return {
    statusCode: 200,
    ...await compressJsonBasedOnEvent()(e, {
      user: {
        email: u.email,
        uacct: u.uacct,
        displayName: u.displayName
      }
    })
  }
}

const validatedGET: IFunc = async (e, c) => {
  return validate(
    getResponder,
    {},
    authTokenShouldBeProvided,
    authTokenShouldBeValid,
    authTokenShouldContainValidUacct('validUacct') // sidecar: IUser
  )(e, c)
}

const rmoveOobToken = async (uacct: string| IUser, tokenLabel:string) => {
  const u:IUser = typeof uacct === 'string' ? await user.getByID(uacct) : uacct
  const priorNumTokens = u.oobTokens.length
  const rmTOTPoptionIdx = u.oobTokens.reduce((_, oob, i) => oob.userLabel === tokenLabel ? i : -1, -1)
  if (rmTOTPoptionIdx !== -1) {
    await user.ent.update({ uacct: u.uacct, oobTokens: { $remove: [rmTOTPoptionIdx] } })
    return { u, tokenCount: priorNumTokens - 1 }
  } else {
    return { u, tokenCount: priorNumTokens }
  }
}

// PUT
const putResponder : Responder<{}> = async (d, e, c, sidecars) => {
  const userBeforeChange = sidecars.validUacct as unknown as IUser

  const { refreshBackupCodes, plaintextPassword, addTOTP, rmTOTP, ...updates } = pluckUpdateFields(e)
  const addBackupCodes = refreshBackupCodes ? { backupCodes: await user.otp.genBackups() } : {}
  const TOTPdetails = await user.otp.gen2FA(userBeforeChange.uacct, 'TOTP', addTOTP)
  const priorNumTokens = userBeforeChange.oobTokens.length
  const rmTOTPoptionIdx = userBeforeChange.oobTokens.reduce((_, oob, i) => oob.userLabel === rmTOTP ? i : -1, -1)

  const userUdpates = {
    ...updates,
    ...addBackupCodes,
    ...(addTOTP ? { oobTokens: { $append: [TOTPdetails] } } : {}),
    ...(rmTOTPoptionIdx !== -1 ? { oobTokens: { $remove: [rmTOTPoptionIdx] } } : {}),
    ...(plaintextPassword ? { pwHash: await user.password.toHash(plaintextPassword) } : {}),
    uacct: userBeforeChange.uacct
  }

  await user.ent.update(userUdpates)
  // const updatedUser = await user.getByID(userBeforeChange.uacct)

  return {
    statusCode: 200,
    ...await compressJsonBasedOnEvent()(e, {
      status: 'updated',
      user: {
        uacct: userUdpates.uacct,
        email: userUdpates.email ?? userBeforeChange.email,
        displayName: userUdpates.displayName ?? userBeforeChange.displayName
      },
      ...(addTOTP
        ? {
            TOTPdetails: {
              strategy: TOTPdetails.strategy,
              label: TOTPdetails.userLabel,
              uri: TOTPdetails
            }
          }
        : {}
      ),
      ...(rmTOTP
        ? {
            TOTPdetails: {
              wasRemoved: rmTOTPoptionIdx !== -1,
              tokensRemaining: rmTOTPoptionIdx === -1 ? priorNumTokens : priorNumTokens - 1
            }
          }
        : {}
      )
    })
  } as SRet
}

const validatedPUT: IFunc = validate(
  putResponder,
  {},
  authTokenShouldBeProvided,
  authTokenShouldBeValid,
  authTokenShouldContainValidUacct('validUacct')
)

// POST
const postResponder: Responder<Required<FlatPostUserInfo>> = async (d, e, c) => {
  const usr = await user.genUser(
    d.email as string,
    d.plaintextPassword as string,
    d.uacct as string | undefined,
    d.displayName as string | undefined
  )
  const userResp = {
    uacct: usr.uacct,
    email: usr.email,
    displayName: usr.displayName
    // delegation: usr.delegation
  }

  return {
    statusCode: 200,
    ...await compressJsonBasedOnEvent()(e, { user: userResp })
  } as SRet
}

const validatedPOST: IFunc = async (e, c) => {
  const acceptanceTok = pluckAcceptanceToken(e)
  const uInfo = pluckUserSetupInfo(e)

  // console.log({ uInfo, acceptanceTok })

  return validate(
    postResponder,
    { acceptanceTok, ...uInfo },
    userShouldNotPrexist,
    hasAllRequiredFields(
      ['email', 'plaintextPassword'],
      'To Add A User - Provide All Required Field: [\'email\',\'plaintextPassword\']'),
    acceptanceTokenSigShouldMatchInlineInfo
  )(e, c)
}

// DELE
const deleResponder: Responder<{}> = async (d, e, c, sidecars) => {
  const u = sidecars.validUacct as IUser
  const deleInfo = pluckDeleteFields(e)
  const removed = {} as {[str:string]:unknown }

  if (deleInfo.rmTOTPlabel) {
    const { tokenCount } = await rmoveOobToken(u.uacct, deleInfo.rmTOTPlabel)
    removed.oobToken = { tokenCount }
  }
  if (deleInfo.rmUacctID) {
    await user.ent.delete({ uacct: u.uacct })
    removed.uacct = { uacct: u.uacct }
  }
  if (deleInfo.rmDelegateToken) {
    removed.delegate = { token: deleInfo.rmDelegateToken, msg: 'this actually did not work yet' }
  }

  return {
    statusCode: 200,
    ...await compressJsonBasedOnEvent()(e, { removed })
  } as SRet
}

const validatedDELE: IFunc = async (e, c) => {
  return validate(
    deleResponder,
    {},
    authTokenShouldBeProvided,
    authTokenShouldBeValid,
    authTokenShouldContainValidUacct('validUacct')
  )(e, c)
}

/**
 * @note If Dealing with onBehalf{uacct} -vs- me{uacct}
 * @note - cnosider a new endpoint:
 * authToken + `/delegations`
 *
 * Consider:
 * GET who can i help + who can help me
 * PUT Change who can help me
 * POST Add people to help me
 * DELE Remove people from being my delegate
 *
 *
 * POST: (userInfo, acceptanceToken) -> NEW User Response
 + GET: (authToken) -> Behalf User Response
 + PUT: (authToken) -> Updated Behalf User Response
 + DELE: (authToken) -> Delete User Response
 */
export const get = validatedGET
export const put = validatedPUT
export const post = validatedPOST
export const dele = validatedDELE
export const handler = baseHandle({ get, post, put, dele })
export default handler
