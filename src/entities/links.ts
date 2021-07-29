
import type * as k from '../types'
import type { LinkKind } from './entities'
import type { DocumentClient } from 'aws-sdk/clients/dynamodb'

import { appTable, customTimeStamps } from './entities'
import { Entity } from 'dynamodb-toolbox'
import { nanoid } from 'nanoid'
// import base32 from 'hi-base32'

const linkFromStringOrStructured = async (v:BatchCreateElem, i:number, a: BatchCreateElem[]) => {
  return link.ent.putBatch(await link.create(v))
}

const didFindResult = (result?:any):boolean=> !!result && Object.keys(result).length !== 0

export const link = {
  pk: (data:{short:string}) => `l#${data.short}`,
  sk: (data:{short:string}) => `l#${data.short}`,
  get: (i:{short:string}) => link.ent.get(i).then(d=> d.Item),
  /**
   * ## Create Link 
   * with proper structure but it does not save the ILink
   * will need to save the link to the Link table space after creation
   * @param linkInputs 
   */
  create : async (linkInputs:CreateLinkInput):Promise<ILink>=>({
    ...linkInputs,
    ownerUacct: linkInputs.ownerUacct ?? 'ericdmoore',
    isDynamic: !!linkInputs.dynamicConfig ?? false,
    short: await link.ensureVanityAvail(linkInputs.short)
  }),
  ensureVanityAvail: async (short?:string, tries = 1, tryLen = 4):Promise<string> => {
    // console.log({short,tries, tryLen})
    if(short){
      if(didFindResult(await link.ent.get({short}).catch(er => {return null}))){
        /* istanbul ignore else */
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
    geos:(urls:UrlSwitchAt<string>[]):DynamicGeo => ({geos: urls}),
    rotates:(urls:UrlSwitchAt<number>[]):DynamicRotate => ({rotates: urls}),
    expires:(urls:UrlSwitchAt<number>[]):DynamicExpires => ({expires: urls}),
    hurdles:(urls:UrlSwitchAt<number>[]):DynamicHurdle => ({hurdles: urls}),
    keepalive:(urls:UrlSwitchAt<number>[]):DynamicKeepAlive => ({keepalive: urls}),
  },
  batch:{
    create: async (inputs:BatchCreateElem[]) : Promise<ILink[]> => {
      const batchinput = await Promise.all(inputs.map(linkFromStringOrStructured))
      await appTable.batchWrite(batchinput)
      return batchinput.map(b=>Object.values(b)).flat(1).map(v=> v.PutRequest?.Item as ILink)
    },
    get: async (shorts: BatchGetElem[]):Promise<ILink[]> => {
      const batchGet = await appTable.batchGet(
        shorts.map(l=>link.ent.getBatch(l)) 
      ) as DocumentClient.BatchGetItemOutput
      return Object.values(batchGet.Responses ?? {}).flat(1) as ILink[]
    },
    put: async(...links:ILink[])=>{
      await appTable.batchWrite(links.map(l=>link.ent.putBatch(l)))
      return links
    },
  },
  ent: new Entity({
    table: appTable,
    name: 'link',
    timestamps: false,
    attributes: customTimeStamps({
      // pk + sk
      short: { type: 'string' },
      // required
      long: { type: 'string', required: true },
      isDynamic: {type:'boolean', default: false },
      ownerUacct: { type: 'string', required: true, default:'ericdmoore' },
      //
      metatags: { type: 'map' },
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
  short?: string
  ownerUacct?:string

  metatags?: Dict<string> 
  tags?: Dict<string>
  params?: Dict<string>
  dynamicConfig?: DynamicKind
}

export interface ILink{
  long: string
  short: string
  isDynamic: boolean
  ownerUacct: string
  
  metatags?: Dict<string>
  tags?: Dict<string>
  params?: Dict<string>
  dynamicConfig?: DynamicKind
}

type Dict<T> = {[s:string]:T}
export type UrlSwitchAt<T> = {
  at: T
  url: string | DynamicKind 
}

// needs long
export type BatchCreateElem = {long:string, short?:string}

// needs short
export type BatchGetElem = {short:string, long?:string}

export interface DynamicRotate {rotates:UrlSwitchAt<number>[]} //--> url-like
export interface DynamicExpires {expires:UrlSwitchAt<number>[]} //--> url-like
export interface DynamicHurdle {hurdles:UrlSwitchAt<number>[]} //--> url-like
export interface DynamicGeo {geos:UrlSwitchAt<string>[]} //--> url-like
export interface DynamicKeepAlive{keepalive:UrlSwitchAt<number>[]} //--> url-like

export type DynamicKind =
| DynamicExpires
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