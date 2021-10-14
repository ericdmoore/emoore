/**
 * @tood remove appTable by integrating this functionality into entity/link
 */

import type { IFunc, Responder, SRet } from '../types'
import type { ILink, DynamicKind } from '../entities/links'
import type { ValidationResp } from './validations'

import baseHandle from '../utils/methodsHandler'
import pluckDataFor from '../utils/pluckData'
import validate from './validations'
import { accessToken } from '../auths/tokens'
import { respSelector, jsonResp } from '../utils/SRetFormat'
import { link, userAccess } from '../entities'
import {
  authTokenShouldBeProvided,
  authTokenShouldBeValid
} from '../validators/tokens'

import {
  pluckLongPaths,
  pluckShortPaths,
  allLinkInputsHaveCorrectStructure,
  allLinksHaveAScheme,
  allShortLinksAreValid,
  linkBatchSize,
  updateCommandIsValid,
  shortLinksAreStrings
} from '../validators/links'

// import * as t from 'io-ts'
// import {possible} from '../utils/codecs'
// import {allDynamics} from '../validators/links'
// import type { DocumentClient } from 'aws-sdk/clients/dynamodb'
// import { getJWTobject } from '../auths/validJWT'
// import JSON5 from 'json5'

// #region interfaces

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

// #endregion interfaces

const compressableJson = respSelector(jsonResp)

export const validedGET:IFunc = async (event, ctx) => {
  const paths = pluckShortPaths(event) as (string | {short:string, long?:string})[]
  const shorts = paths.map(short => typeof short === 'string' ? { short } : { short: short.short })
  const token = pluckDataFor('authToken')(event, null)
  if (token) {
    // token mode
    return validate(
      getResponder,
      [],
      authTokenShouldBeProvided,
      authTokenShouldBeValid
    )(event, ctx)
  } else {
    return validate(
      getResponder,
      shorts,
      allShortLinksAreValid
    )(event, ctx)
  }
}
/**
 *
 * @todo ADD PAGINATION
 * @todo filter out unowned links?
 * @param dataPayload
 * @param e
 * @param c
 * @param extras
 */
export const getResponder: Responder<{short:string}[]> = async (dataPayload, e, c, extras) => {
  if (dataPayload.length === 0) {
    // query mode
    const { uacct } = (await accessToken().fromString(
      pluckDataFor('authToken')(e, 'alreadyEnsured')
    )).obj

    const resp = await userAccess.query.byUacct({ uacct })
    const list = resp.Items ?? []

    return {
      statusCode: 200,
      ...await compressableJson()(e, {
        links: await link.batch.get(list.map(l => ({ short: l.short })))
      })
    }
  } else {
    // batch mode
    return {
      statusCode: 200,
      ...await compressableJson()(e, {
        links: await link.batch.get(dataPayload)
      })
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
    authTokenShouldBeValid
  )(event, ctx)
}

/**
 * @param _ data from validate
 * @param e
 */
export const postResponder:Responder<{}> = async (_, e) => {
  // construct links
  // remove existing links
  const links = await Promise.all(
    (pluckLongPaths(e) as (string | {short?:string, long:string})[])
      .map(async s => typeof s === 'string'
        ? await link.create({ long: s })
        : await link.create(s)
      ))
  await link.batch.put(...links)
  await userAccess.batch.put(...links)

  return {
    statusCode: 200,
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
      .map(([short, updateParams]) => {
        return link.ent.update({ short, ...updateParams })
      })
  )

  return {
    statusCode: 200,
    ...await compressableJson()(e, {
      links: await link.batch.get(
        Object.keys(updateCmd).map(short => ({ short }))
      )
    })
  } as SRet
}

export const validatedDELE:IFunc = async (event, ctx) => {
  return validate(
    deleResponder,
    {},
    authTokenShouldBeProvided,
    authTokenShouldBeValid,
    shortLinksAreStrings('linkBatch')
  )(event, ctx)
}

export const deleResponder:Responder<{}> = async (data, event, ctx, extras) => {
  const batchedLinks = extras.linkBatch as ILink[]
  const tok = await (await accessToken().fromString(pluckDataFor('authToken')(event, 'alreadyEnsured'))).obj

  if (batchedLinks.every(l => l.ownerUacct === tok.uacct)) {
    // console.log('all properly owned')
    await link.batch.rm(...batchedLinks).catch(er => 'err')

    return {
      statusCode: 200,
      ...await compressableJson()(event, {
        deleted: batchedLinks.map(l => l.short)
      })
    }
  } else {
    return {
      statusCode: 400,
      ...await compressableJson()(event, {
        errors: [
          {
            code: 400,
            passed: false,
            reason: 'Delete Command can only delete links owned by the uacct represented via the token',
            InvalidDataLoc: '[H>Q>C].del',
            InvalidDataVal: '',
            docRef: ''
          } as ValidationResp
        ]
      })
    }
  }
}

export const get: IFunc = validedGET
export const post: IFunc = validatedPOST
export const put: IFunc = validatedPUT
export const dele: IFunc = validatedDELE
export const handler:IFunc = baseHandle({ get, post, put, dele })
export default handler
