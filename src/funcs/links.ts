import type { IFunc, Responder, SRet, Evt } from '../types'
import { appTable, link, userAccess } from '../entities'
import {jwtVerify} from '../auths/validJWT'
import type { ILink } from '../entities/links'
import baseHandle from '../utils/methodsHandler'
import type { DocumentClient } from 'aws-sdk/clients/dynamodb'
// import { getJWTobject } from '../auths/validJWT'
import JSON5 from 'json5'
import { respSelector, jsonResp }from '../utils/SRetFormat'

import validate from './validations'
import {authTokenShouldBeProvided, authTokenShouldBeValid, pluckAuthTokenFromEvent} from '../validators/tokens'
import {pluckLinkPaths} from '../validators/links'


// #region interfaces
export type ListOfLinks = {kind:'query', data:Promise<DocumentClient.QueryOutput>} | {kind:'batch', data:Promise<DocumentClient.BatchGetItemOutput>}
// #endregion interfaces

// #endregion interfaces

// const TABLE_NAME = process.env.TABLE_NAME ?? 'emooreAppTable' as string

// pluickers

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

const maybeCompressJson = respSelector(jsonResp)

const getLinksBasedOnInput = (e:Evt): (() => Promise<LinkQueryOrBatch>) => {
  const {paths} = pluckLinkPaths(e)
    if (paths.length === 0) {
    const queryP = async () => userAccess.query(await getUacct(e))
    return async () => ({
        kind: 'query' as 'query',
        data: (await queryP()).Items as ILink[]
      }) 
    } else {
    // batchget items
    const batchListP =  link.batch.get(paths)
    return async () => {
      const batch = await batchListP
      return {
        kind: 'batch' as 'batch',
        data: batch as ILink[]
      }}
    }
}

export const validedGET:IFunc = async (event, ctx) => {
  const dynResp = await getLinksBasedOnInput(event)()
  return validate(
    getResponder,
    dynResp,
    async (e, c, d) => {
      // validate via DB
      // const jwtO = await jwtObj(e)
      // const ua = jwtO?.uacct

      // needs network to validate ownership
      if (d.kind === 'query') {
        return {
          code: 400,
          reason: 'Not implemented Yet',
          passed: true,
          InvalidDataLoc: '',
          InvalidDataVal: '',
          docRef: ''
        }
      } else {
        return {
          code: 400,
          reason: 'List of paths did not include any valiid links',
          passed: (d.data?.length ?? 0) > 0,
          InvalidDataLoc: '',
          InvalidDataVal: '',
          docRef: ''
        }
      }
    })(event, ctx)
}

export const getResponder: Responder<LinkQueryOrBatch> = async (dataPayload, event, ctx) => {
  const data = dataPayload
  const kind = data?.kind as 'query' | 'batch' | undefined

  if (kind === 'query') {
    return {
      statusCode: 200,
      isBase64Encoded: false,
      body: JSON.stringify(dataPayload)
    } as SRet
  } else if (kind === 'batch') {
    return {
      statusCode: 200,
      isBase64Encoded: false,
      body: JSON.stringify(dataPayload)
    } as SRet
  } else {
    return {
      statusCode: 200,
      isBase64Encoded: false,
      body: JSON.stringify(dataPayload)
    } as SRet
  }
}

export const validatedPOST:IFunc = async (event, ctx) => {
  // pluck paths 
  // validate paths less than 25
  //
  // @decide what to do with the batch
  // validate short link request unable to fulfill? then the batch is???
  return validate(
    postResponder, 
    {}, 
    authTokenShouldBeProvided, 
    authTokenShouldBeValid
  )(event, ctx)
}

export const postResponder:Responder<{}> = async (data, event, ctx) => {
  
  return {
    statusCode:200,
    ...await maybeCompressJson()(event, {event})
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

export const putResponder:Responder<{}> = async (data, event, ctx) => {
  return {
    statusCode:200,
    ...await maybeCompressJson()(event, {event})
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
    ...await maybeCompressJson()(event, {event})
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