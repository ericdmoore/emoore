import type { IFunc, Responder, SRet, Evt } from '../types'
import type {ValidationTest, ValidationResp} from '../funcs/validations'
import type {
  DynamicKind,
  DynamicRotate,
  DynamicExpires,
  DynamicHurdle,
  DynamicGeo,
  DynamicKeepAlive,
} from '../entities/links'

import {URL} from 'url'
import JSON5 from 'json5'
import * as t from 'io-ts'
import pluckDataFor from '../utils/pluckData'
import {authTokenShouldBeProvided, authTokenShouldBeValid} from './tokens'
import {possible} from '../utils/codecs'

// #region helpers
const JSONParse = (input:string)=>{
  try{ return {er:null, data: JSON.parse(input)} }
  catch(er){ return {er, data:null} }
}

const makesURLError = (s:string)=>{
  try{ const u = new URL(s, 'https://emoo.re'); return false}
  catch(er){ return true }
}

const joinAndShowFails = (element:keyof ValidationResp, ...validations: ValidationResp[])=>{
  return validations.filter(v=>!v.passed).map(v=> v[element]).join(', ')
}

export const pluckPaths = (whereToLook:string) => (e:Evt): unknown => {
  const paths = pluckDataFor(whereToLook)(e, '[]' as string)
  return JSON5.parse(paths, function(key, val){
    return typeof val ==='string' 
      ? decodeURIComponent(val)
      : val
  })
} 

const allHaveScheme = (urls:string[]) => 
    urls.every((long) => 
       long.startsWith('http://') 
    || long.startsWith('https://'))


// #endregion helpers

// #region plucker
export const pluckShortPaths = pluckPaths('shortpaths')
export const pluckLongPaths = pluckPaths('longpaths')
// #endregion plucker

// #region validators

export const linksOrUacctAreProvided: ValidationTest<unknown> = async (e, c, d) => {
  
  const hasLInks = await linksAreProvided(e,c,d)
    .then(passed => typeof passed === 'boolean' ? {passed} : passed) as ValidationResp
  
  const hasAuthToken = await authTokenShouldBeProvided(e,c,d)
    .then(passed => typeof passed === 'boolean' ? {passed} : passed) as ValidationResp
  
  const authTokenIsValid = await authTokenShouldBeValid(e,c,d)
    .then(passed => typeof passed === 'boolean' ? {passed} : passed) as ValidationResp
  
  // console.log({ c1, c2, c3 })

  return {
    code: 400,
    passed: hasLInks.passed && hasAuthToken.passed && authTokenIsValid.passed,
    reason: joinAndShowFails('reason', hasLInks, hasAuthToken, authTokenIsValid),
    InvalidDataLoc: joinAndShowFails('InvalidDataLoc', hasLInks, hasAuthToken, authTokenIsValid),
    InvalidDataVal: joinAndShowFails('InvalidDataVal', hasLInks, hasAuthToken, authTokenIsValid),
    docRef: joinAndShowFails('docRef', hasLInks, hasAuthToken, authTokenIsValid),
  }
}

export const linksAreProvided: ValidationTest<unknown> = async (e, c, d) => {
  if(e.requestContext.http.method.toUpperCase() ==='POST'){
    return allLongLinksAreValid(e,c,d)
  }else{
    return allShortLinksAreValid(e,c,d)
  }
}

const allShortLinksAreValid: ValidationTest<unknown> = async (e, c, d) => {
  const paths = (pluckShortPaths(e) as (string | {short:string, long?:string} )[])
  .map(l => typeof l ==='string' ? l : l.short)
  
  const passed = paths.length === 
      paths.map(short => !makesURLError(short))
      .filter(v => v)
      .length 

  return {
    code: 400,
    reason: 'All Short URL segments need to be able to construct a valid URL',
    passed: paths.length <= 25 && passed , // no above zero check since we might just query on uacct
    InvalidDataLoc: '',
    InvalidDataVal: '',
    docRef: ''
  }
}

const allLongLinksAreValid: ValidationTest<unknown> = async (e, c, d) => {
  
  const paths = (pluckLongPaths(e) as (string | {short?:string, long:string} )[])
    .map(s => typeof s ==='string' ? s : s.long)

  const numPaths = paths.length
  return {
    code: 400,
    reason: 'All Long links must have a schema/protocol',
    passed: numPaths>0 && numPaths<= 25 && allHaveScheme(paths),
    InvalidDataLoc: '',
    InvalidDataVal: '',
    docRef: ''
  }
}

// #endregion validators


// #region codecs


const dyanmicKindRotate : t.Type<DynamicRotate> = t.recursion(
  'DynamicRotate',
   () => t.type({
    rotates: t.array(t.type({
      at: t.number,
      url: t.union([t.string, allDynamics])
    }))
  })
)

const dyanmicKindHurdle: t.Type<DynamicHurdle> = t.recursion(
  'DynamicHurdle',
   () => t.type({
    hurdles: t.array(t.type({
      at: t.number,
      url: t.union([t.string, allDynamics])
    }))
  })
)

const dyanmicKindGeo : t.Type<DynamicGeo> = t.recursion(
  'DynamicGeo',
   () => t.type({
    geos: t.array(t.type({
      at: t.string,
      url: t.union([t.string, allDynamics])
    }))
  })
)

const dyanmicKindKeepAlive: t.Type<DynamicKeepAlive> = t.recursion(
  'DynamicKeepAlive',
  () => t.type({
    keepalive: t.array(t.type({
      at: t.number,
      url: t.union([t.string, allDynamics])
    }))
  })
)

const dyanmicExpires: t.Type<DynamicExpires> = t.recursion(
  'DynamicExpires',
  () => t.type({
    expires: t.array(t.type({
      at: t.number,
      url: t.union([t.string, allDynamics])
    }))
  })
)

export const allDynamics: t.Type<AllDynamics> = t.recursion(
  'AllDynamics', 
  () => t.union([
    dyanmicKindGeo,
    dyanmicKindHurdle, 
    dyanmicKindRotate,
    dyanmicKindKeepAlive, 
    dyanmicExpires
  ])
)

export const incomingLongLinkFullKind = t.type({
  long: t.string,
  short: possible(t.string),
  dynamicConfig: possible(allDynamics),
  ownerUacct: possible(t.string),
  isDynamic: possible(t.boolean),
  og: possible(t.UnknownRecord),
  tags: possible(t.UnknownRecord),
  params: possible(t.UnknownRecord),
  // 
  // to change from unknonw Record to structured recordnpm i 
  // but change the first t.string to be a t.union([ t.literal('k1'),  t.literal('k2')]) 
  // params: possible(t.record(t.string, t.string)),
})

const incomingLongLinkShorthand = t.string
export const incomingLongLink = t.union([incomingLongLinkShorthand, incomingLongLinkFullKind])

// #endregion codecs

// #region interfaces
type AllDynamics = DynamicKind


// #endregion interfaces