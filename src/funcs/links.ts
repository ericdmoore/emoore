import type { IFunc, Responder, SRet, Evt } from '../types'
import { link, userAccess } from '../entities'
import type { ILink } from '../entities/links'
import baseHandle from '../utils/methodsHandler'
import type { DocumentClient } from 'aws-sdk/clients/dynamodb'
// import { getJWTobject } from '../auths/validJWT'
import JSON5 from 'json5'
import validate from './validations'
// import { HttpStatusCode } from '../enums/HTTPstatusCodes'
// #region interfaces
export type ListOfLinks = {kind:'query', data:Promise<DocumentClient.QueryOutput>} | {kind:'batch', data:Promise<DocumentClient.BatchGetItemOutput>}
// #endregion interfaces

// #endregion interfaces

// pluickers
const getListOfshorts = (e:Evt) => JSON5.parse(decodeURIComponent(e.queryStringParameters?.paths ?? '[]')) as string[]
// const jwtObj = (e:Evt) => getJWTobject(e) as Promise<{uacct:string}>

interface LinkQuery{
  kind: 'query'
  data: DocumentClient.QueryOutput
}

interface LinkBatch{
kind: 'batch'
data: ILink[]
}

type LinkQueryOrBatch = LinkBatch | LinkQuery

const getLinksBasedOnInput = (e:Evt): ()=>Promise<LinkQueryOrBatch> => {
  const list = getListOfshorts(e)

  return async () => {
    // get the uacct
    return {
      kind: 'query' as 'query',
      data: await userAccess.query({ uacct: '' })
    }
  }

  // if (list.length === 0) {
  //   // iterate through list
  //   return async () => {
  //     // get the uacct
  //     return {
  //       kind: 'query' as 'query',
  //       data: await userAccess.query({ uacct: '' })
  //     }
  //   } 
  // } else {
  //   // batchget items
  //   return async () => ({
  //     kind: 'batch' as 'batch',
  //     data: await userAccess.query({uacct})
  //   })
  // }
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

export const getFetcher:IFunc = async (event, ctx) => {
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
        // const bArr = await Promise.all((d.data.Items || []).map(async i => !!i))
        return {
          code: 400,
          reason: 'This use does not have access',
          passed: true,
          InvalidDataLoc: '',
          InvalidDataVal: '',
          docRef: ''
        }
      } else {
        return {
          code: 400,
          reason: 'This use does not have access for this link',
          passed: true,
          InvalidDataLoc: '',
          InvalidDataVal: '',
          docRef: ''
        }
      }
    })(event, ctx)
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
