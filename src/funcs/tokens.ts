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

export const isSigValid = (payload:IEmailCredentialInput, passWrdHash: string, signature: string):boolean => {
  return signature === createHmac('sha256', passWrdHash)
    .update(JSON.stringify(payload, Object.keys(payload).sort()))
    .digest('hex')
}

export const getResponder:Responder = async (event, ctx) => {
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
  const creds = pluckCredentialsFromEvent(event)
  const passHash = await user.getViaEmail({ email: creds.email })
  const isValidUser = isSigValid(creds, JSON.stringify(await passHash.Item), creds.signature)

  // email or user
  // maybe oobToken

  const dynResp = await getLinksBasedOnInput(event)()

  return validate(
    getResponder,
    dynResp,
    async (e, c, d) => {
      // validate via DB
      // email | userName, password, and token?

      return {
        code: 400,
        reason: 'This reason will never be triggered',
        passed: true,
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
