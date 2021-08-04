import type { IFunc, Responder, SRet, Evt, JWTelementsExtras } from '../types'
import baseHandle from '../utils/methodsHandler'
import validate from './validations'
import { respSelector, jsonResp }from '../utils/SRetFormat'
import { appTable, link, linkClickCountsByDay, userAccess } from '../entities'
import type { ILink, DynamicKind, UrlSwitchAt} from '../entities/links'
import {jwtVerify} from '../auths/validJWT'
import pluckDataFor from '../utils/pluckData'
import HTTPstatusCodes from '../enums/HTTPstatusCodes'
import fastgeoip from 'fast-geoip'
import {IResult, UAParser} from 'ua-parser-js'
import { userList } from '../../tests/funcs/users.test'

const compressableJson = respSelector(jsonResp)

// #region

type ExpandLinkEvent = ExpandEvent_Click | ExpandEvent_API

interface IPInfo{
    range: [number, number];
    country: string;
    region: string;
    eu: "0" | "1";
    timezone: string;
    city: string;
    ll: [number, number];
    metro: number;
    area: number;
}

interface ExpandEvent_Click{
    kind: 'click'
    geo: IPInfo | null
    useragent: IResult
    ip: string
    time: number
}

interface ExpandEvent_API{
    kind: 'api'
    geo: IPInfo
    useragent: string
    ip: string
    time: number
    user: string
    tzOffset: number

    // who
    // what
    // when
    // where
    // how
}

interface ExpandLinkHistory{
    allTimeExpansions: number
    last24h: number
    lastClick: number
    maxElapsedBetweenClicks?: number
    daysAgo:{
        '1':number
        '2':number
        '3':number
        '4':number
        '5':number
        '6':number
        '7':number
    }
    weeksAgo:{
        '1':number
        '2':number
        '3':number
        '4':number
    }
    monthsAgo:{
        '1':number
        '2':number
        '3':number
    }
}

// #endregion

const cdfify = (nums: number[]) =>nums.reduce((p,c)=>({
    acc: p.acc + c, 
    arr: [...p.arr, p.acc + c] 
}), {acc:0, arr:[] as number[]} ).arr // throw away the helper acc value

const uaparser = new UAParser()

/**
 * @todo Deal with nested definitions of regions. Match the most specific, if no matches move to less specific and search again. 
 * This would make the CATCH_ALL case the `region:"earth"` case
 * Match: Neighborhood, City, County, State, Country, Continent
 * Do similar for Countries with hierarchical nesting regions
 * 
 * @param urls 
 * @param event 
 * @param history 
 */
const collapseGeos = (link:Readonly<ILink>, 
    urls:Readonly<UrlSwitchAt<string>[]>, 
    event:Readonly<ExpandLinkEvent>, 
    history: Readonly<ExpandLinkHistory>
) : string => {
    const listOfGeos = urls.map(u=> u.at)
    const directMaetch = listOfGeos.findIndex(
        cfgdGeo => cfgdGeo.toLowerCase() === event.geo?.country.toLowerCase()
    )
    if(directMaetch !== -1){
        const u = urls[directMaetch].url
        return typeof u === 'string' ? u : dynamciPicker(link, u,event, history)
    }else{
        const catchAllMatch = listOfGeos.findIndex((v,i)=>v.toLowerCase() === '*') // shift,8
        if(catchAllMatch !== -1){
            const u = urls[catchAllMatch].url
            return typeof u === 'string' ? u : dynamciPicker(link, u, event, history)
        }else{
            return link.long
        }
    }
}

const collapseRotates = (link:Readonly<ILink>, 
    urls:Readonly<UrlSwitchAt<number>[]>, 
    event:Readonly<ExpandLinkEvent>, 
    history: Readonly<ExpandLinkHistory>
):string=>{
    const countsPerLinkPDF = urls.map(u=> u.at)
    const totalCountsBeforeREset = countsPerLinkPDF.reduce((p,c)=>p+c,0)
    const countsPerLinkCDF = cdfify(countsPerLinkPDF)

    const countsInTHisCycle = 1 + history.allTimeExpansions % totalCountsBeforeREset
    const idx = countsPerLinkCDF.findIndex( cdfv => cdfv - countsInTHisCycle >= 0)
    
    const u = urls[idx].url
    return typeof u ==='string' ? u : dynamciPicker(link, u,event, history)
}

const collapseExpires = (link:Readonly<ILink>, 
    urls:Readonly<UrlSwitchAt<number>[]>, 
    event:Readonly<ExpandLinkEvent>, 
    history: Readonly<ExpandLinkHistory>
):string=>{
    const expirationTimes = urls.map(u=> u.at) // already a cdf
   
    const idx = expirationTimes.findIndex( timeOfExpiry => timeOfExpiry - Date.now() >= 0)
    if(idx !== -1){
        const u = urls[idx].url
        return typeof u ==='string' ? u : dynamciPicker(link, u, event, history)
    }else{
        // all expired...
        // fall back to orginal long link
        return link.long
    }
}

const collapseHurdles = (link:Readonly<ILink>, 
    urls:Readonly<UrlSwitchAt<number>[]>, 
    event:Readonly<ExpandLinkEvent>, 
    history: Readonly<ExpandLinkHistory>
):string=>{
    // as allTime gets BIG
    // it guarentees that we will choose the last AT value/idx
    const idx = cdfify(
                    urls.map(u=>u.at)
                )
                .findIndex(cdfV => cdfV - history.allTimeExpansions > 0)
    if(idx !==-1){
        const u = urls[idx].url
        return typeof u === 'string' ? u : dynamciPicker(link, u, event, history)
    }else{
        // should never need this
        return link.long
    }
}

const collapseKeepalive = (link:Readonly<ILink>, 
    urls:Readonly<UrlSwitchAt<number>[]>, 
    event:Readonly<ExpandLinkEvent>, 
    history: Readonly<ExpandLinkHistory>
):string=>{
    // time since last click
    // keeps us alive
    // when the time sreads out... the tail/links are ready for fewer clicks.
    //
    // XX X XX XX XX XXXXX XX XX XXXX     XX    X   X     X     X   X      XX X X X     X X  X    X       X         X           X                     X
    //                                  |triggered
    //                      
    // 
    // what if elapsedAllowance = 3

    // max elapsed time > greater than which threshold
    // 
    // elapsedTimes: 3d, 10d, 20d, 90d,
    // 
    console.error('not implemented yet')
    return link.long

    // not kept alive???
    // fall back to orginal long link
}

const dynamciPicker =  (link:Readonly<ILink>, 
    cfg:DynamicKind, 
    event:ExpandLinkEvent, 
    history: ExpandLinkHistory
):string=>{
    if('rotates' in cfg){
        return collapseRotates(link, cfg.rotates, event, history)
    }
    if('expires' in cfg){
        return collapseExpires(link, cfg.expires, event, history) 
    }
    if('geos' in cfg){
        return collapseGeos(link, cfg.geos, event, history)
    }
    if('hurdles' in cfg){
        return collapseHurdles(link, cfg.hurdles, event, history)
    }
    if('keepalive' in cfg){
        return collapseKeepalive(link, cfg.keepalive, event, history)
    }
    return ''
}

const calcDyanmic = async (link:ILink, 
    event: ExpandLinkEvent, 
    history: ExpandLinkHistory
):Promise<string>=> {
    return !link.dynamicConfig 
    ? link.long 
    : dynamciPicker(link, link.dynamicConfig, event, history)
}

export const validatedGET:IFunc = async (event, ctx) => {
    const short = event.pathParameters?.short
    const found = await link.get({short}).catch( er => null)

    // console.log('event')
    // console.dir(event)    
    // console.log({short, found})

    return validate(
            getResponder, 
            {found},
            async (e,c,d)=>{
                // console.log(`Link from the path param : ${JSON.stringify(d.found,null, 2)}`)
                return {
                    code: 400, 
                    reason:'Could Not Find The Short Link Provided',
                    passed: !!d.found,
                    InvalidDataLoc: '[pathVariable]/1 named short',
                    InvalidDataVal: JSON.stringify(d),
                    docRef:'',
                }
            }
        )(event,ctx)
}

export const getResponder: Responder<{found:ILink}> = async (d, e, c, extras) => {
    const statusCode = HTTPstatusCodes.TEMPORARY_REDIRECT
    const history: ExpandLinkHistory = {
        last24h: 0,
        lastClick: Date.now() - 3600 * 48,
        allTimeExpansions: 0,
        daysAgo:{
            "1":0,
            "2":0,
            "3":0,
            "4":0,
            "5":0,
            "6":0,
            "7":0
        },
        weeksAgo:{
            '1':0,
            '2':0,
            '3':0,
            '4':0
        },
        monthsAgo:{
            '1':0,
            '2':0,
            '3':0,
        }
    }
    const event: ExpandLinkEvent = {
        kind: 'click',
        ip: e.requestContext.http.sourceIp,
        time: Date.now(),
        geo: await fastgeoip.lookup(e.requestContext.http.sourceIp),
        useragent: uaparser.setUA(e.requestContext.http.userAgent).getResult()
    }

    const Location =  await calcDyanmic(d.found, event, history)
    const ret : SRet = { 
        statusCode, 
        headers:{ Location },
        isBase64Encoded: false
    }
    return ret
}

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