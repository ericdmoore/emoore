import type { IFunc, Responder, SRet } from '../types'
import type { ILink, DynamicKind, UrlSwitchAt} from '../entities/links'
import type {DocumentClient} from 'aws-sdk/clients/dynamodb'

import baseHandle from '../utils/methodsHandler'
import validate from './validations'
import { respSelector, jsonResp }from '../utils/SRetFormat'
import { link, linkClickCountsByDay } from '../entities'

import HTTPstatusCodes from '../enums/HTTPstatusCodes'
import fastgeoip from 'fast-geoip'
import {IResult, UAParser} from 'ua-parser-js'
import {click} from '../entities'
import {intervalToDuration} from 'date-fns'

const compressableJson = respSelector(jsonResp)

// #region types


type Union1toSeven = '1' | '2' | '3' | '4' | '5' | '6' | '7' 
type Union1toFour  = '1' | '2' | '3' | '4'
type Union1toThree = '1' | '2' | '3' 



interface OneToThree{
    '1':number
    '2':number
    '3':number
}

interface OneToFour{
    '1':number
    '2':number
    '3':number
    '4':number
}

interface OneToSeven{
    '1':number
    '2':number
    '3':number
    '4':number
    '5':number
    '6':number
    '7':number
}

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

export interface ExpandLinkHistory{
    allTimeExpansions: number
    lastClick: number
    // maxElapsedBetweenClicks?: number
    last24Hr: number[]
    daysAgo: OneToSeven
    weeksAgo: OneToFour
    monthsAgo: OneToThree
}

// #endregion types

const uaparser = new UAParser()

const cdfify = (nums: number[]) =>nums.reduce((p,c)=>({
    acc: p.acc + c, 
    arr: [...p.arr, p.acc + c] 
}), {acc:0, arr:[] as number[]} ).arr // throw away the helper acc value

const groupBy = (windowType:'days' | 'weeks' |'months' ) =>{
    
    const end = new Date()
    let init: (OneToSeven | OneToFour | OneToThree ) & {'0':number}
    
    switch(windowType){
        case 'days':
            init = {'0':0, '1':0,'2':0,'3':0,'4':0,'5':0,'6':0,'7':0} 
            break
        case 'weeks':
            init = {'0':0,'1':0,'2':0,'3':0,'4':0} 
            break
        case 'months':
            init = {'0':0,'1':0,'2':0,'3':0}
            break
    }

    const reducer = (p: OneToSeven | OneToFour | OneToThree, c: DocumentClient.AttributeMap, i:number, arr:DocumentClient.AttributeMap[])=>{
        let priorVal: number
        let durationTypeCount: Union1toSeven
        const agoDuration = intervalToDuration({ end, start: new Date(c.cts) })

        switch(windowType){
            case 'days':

                durationTypeCount = (agoDuration[windowType] ?? 0 ).toString() as Union1toSeven
                priorVal = (p as OneToSeven)[durationTypeCount]
                
                // console.log({cts:c.cts, pv: priorVal, days:durationTypeCount})
                
                return { ...p,  [durationTypeCount]: priorVal + 1 } as OneToSeven & {'0'?:number}
            case 'weeks':
                const days = agoDuration.days ?? 0 
                const durLt7  = Math.floor(days / 7)
                durationTypeCount = durLt7.toString() as Union1toFour
                priorVal = (p as OneToFour)[durationTypeCount]

                // console.log({ days, durLt7, weeks:durationTypeCount, cts: new Date(c.cts), pv: priorVal})

                return { ...p,  [durationTypeCount]: priorVal + 1 } as OneToFour & {'0'?:number}
            case 'months':
                durationTypeCount = (agoDuration[windowType] ?? 0 ).toString() as Union1toThree
                priorVal = (p as OneToThree)[durationTypeCount]
                
                // console.log({cts:c.cts, pv: priorVal, months:durationTypeCount})
                
                return { ...p,  [durationTypeCount]: priorVal + 1 } as OneToThree & {'0'?:number}
        }
    }

    return (arr: DocumentClient.AttributeMap[])=>{
        // console.log({arr, windowType })
        // windowType === 'weeks' && console.log({windowType},arr.map(c => intervalToDuration({ end, start: new Date(c.cts) })))
        const ret = arr.reduce(reducer, init) as ((OneToSeven | OneToFour | OneToThree) & {'0'?:number})
        '0' in ret && delete ret['0']
        return ret
    }
}

const max = (arr: {cts:number}[])=>arr.reduce((p,c)=> c.cts > p ? c.cts : p, -Infinity)

export const getLinkHistory = async(short: string, stop = Date.now()) : Promise<ExpandLinkHistory> => {
    // console.log('getLinkHistory',{short, stop})
    
    const [
        allTimeExpansions, 
        hours24, 
        days7, 
        weeks4, 
        months3 
    ] = await Promise.all([
        click.query.count(short, {stop}),
        click.query.last24Hrs({short, stop}),
        click.query.byDays({short, stop, goBack:7+1}),
        click.query.byWeeks({short, stop, goBack:4+1}),
        click.query.byMonths({short, stop, goBack:3+1}),
    ])
    
    // console.log(weeks4.Items?.length)
    // console.dir(weeks4)
    // console.dir(months3)

    const daysAgo = groupBy('days')(days7.Items ??[]) as OneToSeven
    const weeksAgo = groupBy('weeks')( weeks4.Items ??[]) as OneToFour
    const monthsAgo = groupBy('months')( months3.Items ??[]) as OneToThree
        
    return {
        lastClick: max((hours24.Items ?? []) as {cts:number}[]),
        last24Hr: (hours24.Items ?? []).map(click => click.cts as number), // [cts]
        allTimeExpansions: allTimeExpansions.Count ?? -1,
        // maxElapsedBetweenClicks: -1,
        daysAgo,
        weeksAgo,
        monthsAgo
    }
}

/**
 * @todo Deal with hierarchy/nested regional definitions for link.dynamicConfig. 
 * Match the most specific, if no matches move to less specific and search again. 
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

/**
 * @param d 
 * @param e 
 * @param c 
 * @param extras
 */
export const getResponder: Responder<{found:ILink}> = async (d, e, c, extras) => {
    const statusCode = HTTPstatusCodes.TEMPORARY_REDIRECT

    const history = await getLinkHistory(d.found.short)
    const nullableGeo = await fastgeoip.lookup(e.requestContext.http.sourceIp)
    const geo = !!nullableGeo ? nullableGeo : undefined

    await click.batch.save([{
        short: d.found.short,
        long: d.found.long, 
        ip: e.requestContext.http.sourceIp,
        useragent: e.requestContext.http.userAgent,
        cts: Date.now(),
        geo,
    }])

    const event: ExpandLinkEvent = {
        kind: 'click',
        geo: nullableGeo,
        time: Date.now(),
        ip: e.requestContext.http.sourceIp,
        useragent: uaparser.setUA(e.requestContext.http.userAgent).getResult()
    }

    const Location =  await calcDyanmic(d.found, event, history)

    const ret : SRet = { 
        statusCode, 
        headers: { Location, 'X-History': JSON.stringify(history)},
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