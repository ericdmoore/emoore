/* 
Expand
========

GET POST PUT DEL /expand/path

input: /shortpath

*/
import type { IFunc, Responder, SRet, Evt, JWTelementsExtras } from '../types'
import baseHandle from '../utils/methodsHandler'
import validate from './validations'
import { respSelector, jsonResp }from '../utils/SRetFormat'

import { appTable, link, userAccess } from '../entities'
import {jwtVerify} from '../auths/validJWT'
import type { ILink, DynamicKind} from '../entities/links'

const compressableJson = respSelector(jsonResp)


export const validatedGET:IFunc = async (event, ctx) => {
    return validate(getResponder, {})(event,ctx)
}

export const getResponder: Responder<{}> = async (d, e, c, extras) => {
    return {
    statusCode:200,
    ...await compressableJson()(e,{
        links : await link.batch.get([])
    }),
    } as SRet
}
  

export const validatedPOST:IFunc = async (event, ctx) => {
    return validate(postResponder, {})(event,ctx)
}

export const postResponder: Responder<{}> = async (d, e, c, extras) => {
    return {
    statusCode:200,
    ...await compressableJson()(e,{
        links : await link.batch.get([])
    }),
    } as SRet
}


export const validatedPUT:IFunc = async (event, ctx) => {
    return validate(putResponder, {})(event,ctx)
}

export const putResponder: Responder<{}> = async (d, e, c, extras) => {
    return {
    statusCode:200,
    ...await compressableJson()(e,{
        links : await link.batch.get([])
    }),
    } as SRet
}


export const validatedDELE:IFunc = async (event, ctx) => {
  
    return validate(
      deleResponder, 
      {},
    )(event, ctx)
  }
  
export const deleResponder:Responder<{}> = async (d, e, c, extras) => {
    return {
        statusCode:200,
        ...await compressableJson()(e,{
            links : await link.batch.get([])
        }),
    } as SRet
}  

export const get: IFunc = validatedGET
export const post: IFunc = validatedPOST
export const put: IFunc = validatedPUT
export const dele: IFunc = validatedDELE
export const handler:IFunc = baseHandle({ get, post, put, dele })
export default handler