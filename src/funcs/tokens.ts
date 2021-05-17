import type { IFunc, SRet, Evt, Responder } from '../types'
import baseHandle from './common'
import { createHmac } from 'crypto'
import { user } from '../entities/entities'

/** Overview
 * GET :: token -> tokens
 * POST :: user -> starterToken -> (+2FA)-> token
 * PUT :: token -> token
 * DELE :: token -> confimationMessage
 */

// import { getJWTobject } from '../auths/validJWT'
// import JSON5 from 'json5'
import validate from './validations'

// import { HttpStatusCode } from '../enums/HTTPstatusCodes'
// #region interfaces

export interface IEmailCredentialInput{
    email: string
    signature: string
    oobToken?: string
    oobProvider?: string
}

// #endregion interfaces

// pluickers

/**
 * ## Pluck Data For KeyString
 *
 * `Headers > QueryString > Cookies`
 * @param key
 * @returns
 */
const pluckDataFor = (key:string) => (e:Evt): string | undefined => {
  return e.headers?.[key] ??
  e.queryStringParameters?.[key] ??
  e.cookies?.filter(c => c.startsWith(`${key}=`))[0]
}

/**
 *
 * @param e
 */
export const pluckCredentialsFromEvent = (e:Evt): IEmailCredentialInput => {
  const oobProvider = pluckDataFor('oobProvider')(e)
  const oobToken = pluckDataFor('oobToken')(e)

  return {
    email: decodeURI(pluckDataFor('email')(e) ?? ''),
    signature: decodeURI(pluckDataFor('signature')(e) ?? ''),
    ...(oobToken
      ? { oobToken: decodeURI(oobToken) }
      : {}
    ),
    ...(oobProvider
      ? { oobProvider: decodeURI(oobProvider) }
      : {}
    )
  }
}

export const calcSignature = async (dataPayload: string, secret:string) => {}

export const isSigValid = (creds:IEmailCredentialInput, passWrdHash: string):boolean => {
  return creds.signature === createHmac('sha256', passWrdHash)
    .update(JSON.stringify(creds, Object.keys(creds).sort()))
    .digest('hex')
}

const getTokensForUserBasedOnEvent = (e:Evt) => {
  if (e.queryStringParameters?.paths) {
    return async () => {}
  } else {
    return async () => {}
  }
}

export const getResponder:Responder = async (event, ctx, data) => {
  return {
    statusCode: 200,
    isBase64Encoded: false,
    body: JSON.stringify(event)
  } as SRet
}

/**
 * Token
 * @param event
 * @param ctx
 * @returns
 */
export const getFetcher:IFunc = async (event, ctx) => {
  // email or user
  // maybe oobToken

  const dynResp = await getTokensForUserBasedOnEvent(event)()

  return validate(
    getResponder,
    dynResp,
    async (e, c, d) => {
      const creds = pluckCredentialsFromEvent(e)
      const passHash = await user.getViaEmail(creds)

      return {
        code: 400,
        reason: 'This reason will never be triggered',
        passed: isSigValid(creds, JSON.stringify(await passHash.Item?.passwordHash)),
        InvalidDataLoc: '',
        InvalidDataVal: '',
        docRef: ''
      }
    })
}
/**
 *
 * @param e Event from Gateway
 * @param e.headers.auth JWT
 * @param e.queryStringParameters.paths JSON enc string[]
 * @param e.queryStringParameters.next nextString token
 * @param c Context
 * @returns
 */
export const get: IFunc = async (e, c) => {
  return getFetcher(e, c)
}

export const post: IFunc = async (e, c) => {
  return getFetcher(e, c)
}

export const put: IFunc = async (e, c) => {
  return getFetcher(e, c)
}

export const dele: IFunc = async (e, c) => {
  return getFetcher(e, c)
}

export const handler:IFunc = baseHandle({ get, post, put, dele })
export default handler