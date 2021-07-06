
import type * as k from '../types'
import type { LinkKind } from './entities'
import base32 from 'hi-base32'
import { appTable, customTimeStamps } from './entities'
import { Entity } from 'dynamodb-toolbox'
import type { DocumentClient } from 'aws-sdk/clients/dynamodb'

import { nanoid } from 'nanoid'

const linkFromStringOrStructured = async (v:BatchCreateElem, i:number, a: BatchCreateElem[]) => {
  const l = typeof v === 'string'
  ? await link.create({ long: v })
  : await link.create(v)
  
  // console.log({l,ret})
  // return ret
  return link.ent.putBatch(l)
}

const didFindResult = (result?:any):boolean=> !!result && Object.keys(result).length !== 0

export const link = {
  pk: (data:{short:string}) => `l#${data.short}`,
  sk: (data:{short:string}) => `l#${data.short}`,
  get: (i:{short:string}) => link.ent.get(i),
  create : async (linkInputs:CreateLinkInput):Promise<ILink>=>({
    ...linkInputs,
    ownwerUacct: 'ericdmoore',
    isDynamic: linkInputs.isDynamic ?? false,
    short: await link.ensureVanityAvail(linkInputs.short)
  }),
  ensureVanityAvail: async (short?:string, tries = 1, tryLen = 4):Promise<string> => {
    // console.log({short,tries, tryLen})
    if(short){
      if(didFindResult(await link.ent.get({short}).catch(er => {return null}))){
        if(tries <= 3){
          return link.ensureVanityAvail( nanoid(tryLen), tries+1)
        }else{
          // lots of tries, so use bigger len
          return link.ensureVanityAvail( nanoid(tryLen), tries+1, tryLen+1)
        }
      }else{        
        return short
      }
    }else{
      // no collision - so start a new call-stack
      // console.log('givein nothing so verifying a new rand short', {tryLen, tries})
      return link.ensureVanityAvail( nanoid(tryLen) )
    }
  },
  dynamicConfig:{
    rotate:(urls:UrlList<number>) => ({rotate: urls}),
    hurdle:(urls:UrlList<number>) => ({hurdle: urls}),
    geo:(urls:UrlList<string>) => ({geo: urls}),
    keepalive:(urls:UrlList<number>) => ({keepalive: urls}),
  },
  batch:{
    create: async (inputs:BatchCreateElem[]) : Promise<ILink[]> => {
      const batchinput = await Promise.all(inputs.map(linkFromStringOrStructured))
      await appTable.batchWrite(batchinput)
      // console.log(JSON.stringify(batchinput,null, 2))
      // peel off the table key from each obj already in the array
      return batchinput.map(b=>Object.values(b)).flat(1).map(v=> v.PutRequest?.Item as ILink)
    },
    get: async (shorts: BatchGetElem[]):Promise<ILink[]> => {
      const batchGet = await appTable.batchGet(
        shorts.map(l=>link.ent.getBatch(l)) 
      ) as DocumentClient.BatchGetItemOutput

      return Object.values(batchGet.Responses ?? {}).flat(1) as ILink[]
    },
  },
  ent: new Entity({
    table: appTable,
    name: 'link',
    timestamps: false,
    attributes: customTimeStamps({
      // pk
      short: { type: 'string' },
      // sk + required
      long: { type: 'string', required: true },
      isDynamic: {type:'boolean', default: false },
      ownwerUacct: { type: 'string', required: true, default:'ericdmoore' },
      //
      og: { type: 'map' },
      tags: { type: 'map' },
      params: { type: 'map' },
      dynamicConfig: {type:'map'},
      pk: { hidden: true, partitionKey: true, dependsOn: 'short', default: (data: k.TableType<LinkKind>) => `l#${data.short}` },
      sk: { hidden: true, sortKey: true, dependsOn: 'short', default: (data:LinkKind) => `l#${data.short}` }
    })
  })
}



export interface CreateLinkInput{
  long: string
  ownwerUacct?:string
  short?: string    
  isDynamic?:boolean
  og?: Dict<string> 
  tags?: Dict<string>
  params?: Dict<string>
  dynamicConfig?: DynamicKind
}

export interface ILink{
  short: string
  long: string
  isDynamic: boolean
  ownwerUacct: string
  og?: Dict<string>
  tags?: Dict<string>
  params?: Dict<string>
  dynamicConfig?: DynamicKind
}

type Dict<T> = {[s:string]:T}
type UrlList<T> = { 
  at: T
  url: string | DynamicKind 
}[]

// needs long
export type BatchCreateElem = {long:string, short?:string}

// needs short
export type BatchGetElem = {short:string, long?:string}

interface DynamicRotate {rotate:UrlList<number>} //--> url-like
interface DynamicHurdle {hurdle:UrlList<number>} //--> url-like
interface DynamicGeo {geo:UrlList<string>} //--> url-like
interface DynamicKeepAlive{keepalive:UrlList<number>} //--> url-like

type DynamicKind = 
| DynamicRotate
| DynamicHurdle
| DynamicGeo
| DynamicKeepAlive

/**
 * # Link Configs
 * 
 * ## Social Preview MetaData
 * - add share preview info
 * 
 * ## Pass Through Params
 * - if you url params QueryString + Fragments
 * `saveParams: true | ['whiteListOfParams']`
 *
 * ## Groupings
 * - internal tags not shown to users but enabling ad-hoc rollups
 *
 * 
 * ## Round Robin Link (A/B/Test)
 * - round robin to various under links
 * 
 * 
 * ## Change On Click Hurdle
 * - Set up Hurldes
 * intial link is the after zero clicks
 * thresholds setup new variants for after X,Y,Z clicks
 *
 *  
 * ## Click To Keep Alive
 * Time out due to lack of activity
 * - intial link is the long term link
 * - layer in a special link while its "alive"
 * 
 * 
 * ## Geo-Route Clicks
 * - rough-geos to 
 * - initial link is the 'unknown' case
 * 
 * 
 * dyanmic: yes/ no
 * 
 * type DynamicConfig = dynamicRotate | dyanmicThreshold | dynamicGeo | dynamicKeepAlive
 * type DynamicOrStatic = DynamicConfig | string
 * 
 * // A/B Test
 * rotate({ url: weightFactor })  // ouputType: {rotate: []}}
 * 
 * // SoftLaunch
 * hurdle({ url: clickNum }) // ouputType: {hurdle: []}}
 * 
 * // GDPR
 * geo({url: geoCode }) // ouputType: {geo: []}}
 * 
 * //
 * keepalive({ url: timeNumber }) // ouputType: {keepalive: []}}
 * 
 * 
 */