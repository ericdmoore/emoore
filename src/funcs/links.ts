import type { IFunc, Responder, SRet, Evt, JWTelementsExtras } from '../types'
import { appTable, link, userAccess } from '../entities'
import {jwtVerify} from '../auths/validJWT'
import type { ILink, DynamicKind} from '../entities/links'
import baseHandle from '../utils/methodsHandler'
import * as t from 'io-ts'
import {possible} from '../utils/codecs'
import {allDynamics} from '../validators/links'
// import type { DocumentClient } from 'aws-sdk/clients/dynamodb'
// import { getJWTobject } from '../auths/validJWT'
// import JSON5 from 'json5'
import { respSelector, jsonResp }from '../utils/SRetFormat'

import validate from './validations'
import {authTokenShouldBeProvided, authTokenShouldBeValid, pluckAuthTokenFromEvent} from '../validators/tokens'
import {
  pluckLongPaths, 
  pluckShortPaths, 
  allLinkInputsHaveCorrectStructure,
  allLinksHaveAScheme,
  allShortLinksAreValid,
  linkBatchSize,
  updateCommandIsValid
} from '../validators/links'
import pluckDataFor from '../utils/pluckData'
import { verify } from 'jsonwebtoken'

const compressableJson = respSelector(jsonResp)

// #region interfaces

// #endregion interfaces

export const validedGET:IFunc = async (event, ctx) => {
  const paths = pluckShortPaths(event) as (string | {short:string, long?:string})[]
  const shorts = paths.map( 
    short => typeof short  === 'string' ? {short} :  {short: short.short} 
  )
  const token = pluckDataFor('token')(event,null)
  if(token){
    // token mode
    return validate(
      getResponder,
      [],
      authTokenShouldBeProvided, 
      authTokenShouldBeValid
    )(event, ctx)
  }else{
    return validate(
      getResponder,
      shorts,
      allShortLinksAreValid,
    )(event, ctx)
  } 
}

export const getResponder: Responder<{short:string}[]> = async (dataPayload, e, c, extras) => {
  if(dataPayload.length ===0){
    // query mode
    const tok = await jwtVerify()(
      pluckDataFor('token')(e,'alreadyEnsured')
    ) as {uacct:string}
  
    const resp = await userAccess.query.byUacct(tok)
    const list = resp.Items ?? []

    return {
      statusCode:200,
      ...await compressableJson()(e,{
        links: await link.batch.get(list.map(l=>({short: l.short}) ))
      })
    }
  }else{
    // batch mode
    return {
      statusCode:200,
      ...await compressableJson()(e,{
        links : await link.batch.get(dataPayload)
      }),
    } as SRet
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
    allLinksHaveAScheme('longpaths'),
    linkBatchSize('longpaths'),
    allLinkInputsHaveCorrectStructure('longpaths'),
    authTokenShouldBeProvided, 
    authTokenShouldBeValid,
  )(event, ctx)
}

/**
 * @todo remove existing links
 * @param _ data from validate 
 * @param e 
 */
export const postResponder:Responder<{}> = async (_, e) => {
  // construct links
  // remove existing links
  const links = await Promise.all(
    (pluckLongPaths(e) as (string | {short?:string, long:string})[])
    .map(async s => typeof s ==='string' 
      ? await link.create({long: s})
      : await link.create(s)
  ))
  await link.batch.put(...links)
  await userAccess.batch.put(...links)
  
  return {
    statusCode:200,
    ...await compressableJson()(e, {
      links
    })
  }
}

export const validatedPUT:IFunc = async (event, ctx) => {
  // validations: the plucked(udpate) val should be parse-able
  // entries in the parsed update map should be less than 25
  // entry/keys should exist
  // entry/vals should contain a set of keys or([long, og, tags, params, dynammicConfig ])
  // 
  
  return validate(
    putResponder, 
    {}, 
    authTokenShouldBeProvided, 
    authTokenShouldBeValid,
    updateCommandIsValid('verifiedUpdateCmd') // 4 part validator | exists > parsable > not too large > structure checked
  )(event, ctx)
}

export const putResponder:Responder<{}> = async (data, e, ctx, extras) => {
  // issue command
  const updateCmd = extras.verifiedUpdateCmd as UpdateCommands
  
  await Promise.all(
    Object.entries(updateCmd)
    .map(([short,updateParams])=>{
      return link.ent.update({short, ...updateParams})
    })
  )

  return {
    statusCode:200,
    ...await compressableJson()(e,{ links: await link.batch.get(
        Object.keys(updateCmd).map( short=>({short}))
      ) 
    })
  } as SRet
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

export const get: IFunc = validedGET
export const post: IFunc = validatedPOST
export const put: IFunc = validatedPUT
export const dele: IFunc = validatedDELE
export const handler:IFunc = baseHandle({ get, post, put, dele })
export default handler

type Dict<T> = {[key:string]:T}
interface UpdateCommands{
  [shortPath:string]:{
    long?:string, 
    metatags?: Dict<string>,
    tags?: Dict<string>,
    params?: Dict<string>,
    dynamicConfig?: DynamicKind
  }
}