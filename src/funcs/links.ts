import type { IFunc, Responder, SRet, Evt } from '../types'
import { appTable, link, userAccess } from '../entities'
import {jwtVerify} from '../auths/validJWT'
import type { ILink } from '../entities/links'
import baseHandle from '../utils/methodsHandler'
// import type { DocumentClient } from 'aws-sdk/clients/dynamodb'
// import { getJWTobject } from '../auths/validJWT'
import JSON5 from 'json5'
import { respSelector, jsonResp }from '../utils/SRetFormat'

import validate from './validations'
import {authTokenShouldBeProvided, authTokenShouldBeValid, pluckAuthTokenFromEvent} from '../validators/tokens'
import {pluckLongPaths, pluckShortPaths, linksAreProvided, linksOrUacctAreProvided } from '../validators/links'



// #region interfaces

// #endregion interfaces

// #endregion interfaces

// const TABLE_NAME = process.env.TABLE_NAME ?? 'emooreAppTable' as string

// pluckers


const getUacct = async (e:Evt): Promise<{uacct:string}> => {
  const authTok = pluckAuthTokenFromEvent(e)
  const tokData = await jwtVerify()(authTok).catch(er=> ({uacct:'ericdmoore'}) ) as {uacct?:string}
  return !!tokData.uacct
    ? tokData as {uacct:string}
    : {uacct:'ericdmoore' as string}
}
// const jwtObj = (e:Evt) => getJWTobject(e) as Promise<{uacct:string}>

interface LinkQuery{
  kind: 'query'
  data: ILink[]
}

interface LinkBatch{
  kind: 'batch'
  data: ILink[]
}

type LinkQueryOrBatch = LinkBatch | LinkQuery

// pluckers are always sync
// so this one returns an async thunk quickly

const compressableJson = respSelector(jsonResp)

export const validedGET:IFunc = async (event, ctx) => {
  const paths = pluckShortPaths(event) as (string | {short:string, long?:string})[]
  const shorts = paths.map( 
    short => typeof short  === 'string' ? {short} :  {short: short.short} 
  )
  return validate(
    getResponder,
    shorts,
    linksOrUacctAreProvided,
  )(event, ctx)
}

link.create

export const getResponder: Responder<{short:string}[]> = async (dataPayload, e, c, extras) => {
  const data = dataPayload
  return {
    ...await compressableJson()(e,{
    dataPayload
    })
  }
}

export const validatedPOST:IFunc = async (event, ctx) => {
  //
  // @decide what to do with the batch
  // validate short link request unable to fulfill? then the batch is???
  //
  return validate(
    postResponder, 
    {}, 
    linksOrUacctAreProvided,
  )(event, ctx)
}

export const postResponder:Responder<{}> = async (data, e, ctx) => {

  const links = await Promise.all(
    (pluckLongPaths(e) as (string | {short?:string, long:string} )[])
      .map(async s => typeof s ==='string' 
              ? await link.create({long: s}) 
              : await link.create(s)
      )
    )

  return {
    ...await compressableJson()(e, {
      links
    }),
    statusCode:200,
  }
}

export const validatedPUT:IFunc = async (event, ctx) => {
  return validate(
    postResponder, 
    {}, 
    authTokenShouldBeProvided, 
    authTokenShouldBeValid
  )(event, ctx)
}

export const putResponder:Responder<{}> = async (data, e, ctx) => {
  return {
    ...await compressableJson()(e, {
      data, 
      event: e, 
      ctx}),
    statusCode:200,
  }
}

export const validatedDELE:IFunc = async (event, ctx) => {
  return validate(
    postResponder, 
    {}, 
    authTokenShouldBeProvided, 
    authTokenShouldBeValid
  )(event, ctx)
}

export const deleResponder:Responder<{}> = async (data, event, ctx) => {
  //
  await link.ent.delete()
  return {
    statusCode:200,
    ...await compressableJson()(event, {event})
  }
}

/**
 * Shows:
 * 1. Info For My/This Token
 * 2. Starter Tokens for me - users who delegated to me
 * 3. Revocation Tokens for me - users who I have delegated to
 *
 * @param e Event from Gateway
 * @param e.headers.auth JWT
 * @param e.queryStringParameters.paths JSON enc string[]
 * @param e.queryStringParameters.next nextString token
 * @param c Context
 * @returns
 */
export const get: IFunc = validedGET
export const post: IFunc = validatedPOST
export const put: IFunc = validatedPUT
export const dele: IFunc = validatedDELE
export const handler:IFunc = baseHandle({ get, post, put, dele })
export default handler