/**
 * @author [Eric D Moore](https://ericdmoore.com)
 * @copyright All rights resvered © 2021
 * @license MIT
 * @note delegation is not necessarily helpful for link shortening
 */

import type { IFunc, SRet, Responder } from '../types'
// import type { IUser } from '../entities/users'
import { user, IUser } from '../entities'
// import { jwtSign, jwtVerify } from '../auths/validJWT'
import baseHandle from '../utils/methodsHandler'
import validate from './validations'
import {
  pluckAcceptanceToken,
  pluckUserSetupInfo,
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

import { jsonResp, textResp, respSelector } from '../utils/SRetFormat'
// import { jwtVerify } from '../auths/validJWT'

const compressJsonBasedOnEvent = respSelector(jsonResp)

// GET
const getResponder : Responder<{}> = async (d, e, c, sidecars) => {
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

/**
  * @note delegation is only 1 level, delegates can not re-delegate.
  * @note this endpoint does not have to deal with {me} vs {onBehalf}
  * ::Consider::
  * /delegations
  * GET + authToken  = READ who I help + who can help me
  * PUT + authToken  = Change who can help me = Change my delegates
  * POST + authToken = Add people to help me = Create a delegate
  * DELE + authToken = Remove people from being my delegate= Remove who I help + who can help me
 */
export const get = validatedGET
export const put = validatedGET
export const post = validatedGET
export const dele = validatedGET

export const handler = baseHandle({ get, post, put, dele })
export default handler
