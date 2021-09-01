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


/**
 * 
 * @param event 
 * @param ctx 
 * ## Inputs
 * - link?: string (default = empty and uses l25 array)
 * ## Validations:
 * token is valid
 * 
 */
export const validatedGET:IFunc = async (event, ctx) => {
    return validate(getResponder, {})(event,ctx)
}

export const getResponder: Responder<{}> = async (d, e, c, extras) => {
    return {
    statusCode:200,
    ...await compressableJson()(e,{
        links : await link.batch.get([])
    }),
    }
}
  

/**
 * @todo This could one day be a way to setup queries of interest. 
 * Aka: A Registered Query 
 * Aka: A Query Builder supporting API.
 * The Query builder would not really be an open ended query - but more of a "based on the indexes that are already setup, configure a few of these to suit your needs"
 * For now it seems like a nice to have.
 * @param event
 * @param ctx 
 * @returns 
 */
// export const validatedPOST:IFunc = async (event, ctx) => {
//     return validate(postResponder, {})(event,ctx)
// }

// export const postResponder: Responder<{}> = async (d, e, c, extras) => {
//     return {
//     statusCode:200,
//     ...await compressableJson()(e,{
//         links : await link.batch.get([])
//     }),
//     } as SRet
// }


// export const validatedPUT:IFunc = async (event, ctx) => {
//     return validate(putResponder, {})(event,ctx)
// }

// export const putResponder: Responder<{}> = async (d, e, c, extras) => {
//     return {
//     statusCode:200,
//     ...await compressableJson()(e,{
//         links : await link.batch.get([])
//     }),
//     } as SRet
// }


// export const validatedDELE:IFunc = async (event, ctx) => {
  
//     return validate(
//       deleResponder, 
//       {},
//     )(event, ctx)
//   }
  
// export const deleResponder:Responder<{}> = async (d, e, c, extras) => {
//     return {
//         statusCode:200,
//         ...await compressableJson()(e,{
//             links : await link.batch.get([])
//         }),
//     } as SRet
// }  

export const get: IFunc = validatedGET
export const post: IFunc = validatedGET
export const put: IFunc = validatedGET
export const dele: IFunc = validatedGET
export const handler:IFunc = baseHandle({ get, post, put, dele })
export default handler