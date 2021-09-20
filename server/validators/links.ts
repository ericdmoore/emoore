import type { Evt } from '../types'
import type { ValidationTest } from '../funcs/validations'
import type {
  CreateLinkInput,
  DynamicKind,
  DynamicRotate,
  DynamicExpires,
  DynamicHurdle,
  DynamicGeo,
  DynamicKeepAlive,
  ILink
} from '../entities/links'

import compose, { mergeErrors } from './helpers/composeValidator'
import { URL } from 'url'

import JSON5 from 'json5'
import * as t from 'io-ts'
import { isRight } from 'fp-ts/lib/Either'
import { possible } from '../utils/codecs'
import pluckDataFor from '../utils/pluckData'
import { link } from '../entities'

// import JSONparse from '../utils/jsonParse'
// import {
//   authTokenShouldBeProvided,
//   authTokenShouldBeValid
// } from './tokens'

// #region helpers

const JSONParse = (input:string): ({data:unknown, er:null} | {data:null, er:Error}) => {
  try { return { er: null, data: JSON.parse(input) } } catch (er:unknown) { return { er: er as Error, data: null } }
}

const makesURLError = (shortPath:string) => {
  try {
    // eslint-disable-next-line no-unused-vars
    const u = new URL(shortPath, 'https://emoo.re')
    return false
  } catch (er) { return true }
}

export const pluckPaths = (whereToLook:string) => (e:Evt): unknown => {
  const paths = pluckDataFor(whereToLook)(e, '[]' as string)

  // console.log(JSONparse(paths))
  return JSON5.parse(paths, function (_, val) {
    return typeof val === 'string'
      ? decodeURIComponent(val)
      : val
  })
}

const allHaveScheme = (urls:(string| CreateLinkInput)[]) => {
  return urls.every((long) => {
    const l = typeof long === 'string' ? long : long.long
    return l.startsWith('http://') || l.startsWith('https://')
  })
}

// #endregion helpers

// #region plucker

export const pluckShortPaths = pluckPaths('shortpaths')
export const pluckLongPaths = pluckPaths('longpaths')

// #endregion plucker

// #region validators

export const allShortLinksAreValid: ValidationTest<unknown> = async (e, c, d) => {
  const paths = (pluckPaths('shortpaths')(e) as (string | {short:string, long?:string})[])
    .map(l => typeof l === 'string' ? l : l.short)

  return {
    code: 400,
    reason: 'Not all shortpath/URL segments provided are able to construct a valid URL',
    passed: paths.every(short => !makesURLError(short)),
    InvalidDataLoc: '',
    InvalidDataVal: '',
    docRef: ''
  }
}

export const linkBatchSize = (pathToCheck:'longpaths'|'shortpaths'): ValidationTest<unknown> => async (e, c, d) => {
  const paths = (pluckPaths(pathToCheck)(e) as (string | CreateLinkInput)[])
    .map(long => typeof long === 'string' ? { long } : long)
  const numPaths = paths.length
  return {
    code: 400,
    reason: 'Link batches must be smaller than 25, and larger than 0',
    passed: numPaths > 0 && numPaths <= 25,
    InvalidDataLoc: '',
    InvalidDataVal: '',
    docRef: ''
  }
}

export const allLinksHaveAScheme = (pathToLook:'longpaths'): ValidationTest<unknown> => async (e, c, d) => {
  const paths = (pluckPaths(pathToLook)(e) as (string | CreateLinkInput)[])
    .map(long => typeof long === 'string' ? { long } : long)
  return {
    code: 400,
    reason: 'All links must have a schema/protocol',
    passed: allHaveScheme(paths),
    InvalidDataLoc: '',
    InvalidDataVal: '',
    docRef: ''
  }
}

export const allLinkInputsHaveCorrectStructure = (pathToCheck:'longpaths'):ValidationTest<unknown> => async (e, c, d) => {
  const paths = (pluckPaths(pathToCheck)(e) as (string | CreateLinkInput)[])
    .map(long => typeof long === 'string' ? { long } : long)

  return {
    code: 400,
    reason: 'All Long links must be a `string | {long: string, short?:string}`',
    passed: paths.every((u) => {
      return isRight(incomingLongLink.decode(u))
    })
  }
}

export const linksAreProvided: ValidationTest<unknown> = async (e, c, d) => {
  if (e.requestContext.http.method.toUpperCase() === 'POST') {
    const errs = await compose(
      allLinkInputsHaveCorrectStructure('longpaths'),
      allLinksHaveAScheme('longpaths'),
      linkBatchSize('longpaths')
    )(e, c)
    return errs ? mergeErrors(...errs) : true
  } else {
    // const errs = await compose(
    //   linkBatchSize('shortpaths')
    // )(e, c)
    // return errs ? mergeErrors(...errs) : true
    return allShortLinksAreValid(e, c, d)
  }
}

export const updateCommandIsValid = (keyForVerifedData = 'verifiedUpdateCmd'):ValidationTest<unknown> => async (e, c, d) => {
  const updateStr = pluckDataFor('update')(e, null)
  if (!updateStr) {
    return {
      code: 400,
      passed: false,
      reason: 'Missing stringified update map command',
      InvalidDataLoc: '[H>Q>C].update',
      InvalidDataVal: 'missing!'
    }
  } else {
    if (updateStr.length > 10_000) {
      return {
        code: 400,
        passed: false,
        reason: 'Update Command JSONString exceeded the maxiumum permitted value, consider breaking up the update map',
        InvalidDataLoc: '[H>Q>C].update',
        InvalidDataVal: 'Too Large!'
      }
    }
    const { er, data } = JSONParse(updateStr)
    const d = data as object
    if (er) {
      return {
        code: 400,
        passed: false,
        reason: `Stringified update command was not parsable JSON ${er}`,
        InvalidDataLoc: '[H>Q>C].update',
        InvalidDataVal: d.toString()
      }
    } else {
      const entries = Object.entries(d)
      if (entries.length > 25) {
        return {
          code: 400,
          passed: false,
          reason: 'The Update Command map must have 24 or less entries',
          InvalidDataLoc: '[H>Q>C].update',
          InvalidDataVal: JSON.stringify(entries)
        }
      } else {
        const passed = entries.every(([_, v]) => isRight(updateCommandCodec.decode(v)))

        if (passed) {
          const r = await link.batch.get(entries.map(([k, v]) => ({ short: k })))
          // validate all keys
          if (r.length === entries.length) {
            // console.log('All Validations Pass')
            return {
              code: 400,
              passed: true,
              reason: 'All short path entry keys must already existing in order to be updated',
              InvalidDataLoc: '[H>Q>C].update',
              InvalidDataVal: JSON.stringify(entries),
              expensiveData: { [keyForVerifedData]: Object.fromEntries(entries) }
            }
          } else {
            return {
              code: 400,
              passed: false,
              reason: 'All short path entry keys must already existing in order to be updated',
              InvalidDataLoc: '[H>Q>C].update',
              InvalidDataVal: JSON.stringify(entries)
            }
          }
        } else {
          return {
            code: 400,
            passed,
            reason: 'All entries in the command map must have valid syntax',
            InvalidDataLoc: '[H>Q>C].update',
            InvalidDataVal: JSON.stringify(entries)
          }
        }
      }
    }
  }
}

export const shortLinksAreStrings = (keyForExpData = 'linkBatch'): ValidationTest<unknown> => async (e, c, d) => {
  const deleCmd = JSON.parse(pluckDataFor('del')(e, 'null')) as string[] | null
  let links: ILink[] = []

  if (deleCmd) {
    links = await link.batch.get(deleCmd.map(short => ({ short })))
  }

  const passed = deleCmd !== null &&
      deleCmd.length === links.length &&
      deleCmd.length <= 25 &&
      isRight(t.array(t.string).decode(deleCmd))

  // console.log({deleCmd, links, passed})

  return {
    code: 400,
    passed,
    reason: 'The delete comand should be an array of strings thats less than 25 long',
    InvalidDataLoc: '[H>Q>C].del',
    InvalidDataVal: (deleCmd ?? 'null').toString(),
    expensiveData: { [keyForExpData]: links }
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

export const allDynamics: t.Type<DynamicKind> = t.recursion(
  'AllDynamics',
  () => t.union([
    dyanmicKindGeo,
    dyanmicKindHurdle,
    dyanmicKindRotate,
    dyanmicKindKeepAlive,
    dyanmicExpires
  ])
)

// const ogPrefixes = Object.values(openGraph).map(val=>t.literal(val))
// const [ogPrefixTitle, ogPrefixUrl]  = ogPrefixes.slice(0,2)
// const ogPrefixRest  = ogPrefixes.slice(2)

export const incomingLongLinkFullKind = t.type({
  long: t.string,
  short: possible(t.string),
  dynamicConfig: possible(allDynamics),
  ownerUacct: possible(t.string),
  isDynamic: possible(t.boolean),

  // og + twitter card preview data
  metatags: possible(t.record(t.string, t.string)),

  // internal campaign tags
  tags: possible(t.record(t.string, t.string)),

  // URL param white list to pass along
  params: possible(t.record(t.string, t.string))
})

const incomingLongLinkShorthand = t.string
export const incomingLongLink = t.union([incomingLongLinkShorthand, incomingLongLinkFullKind])

const updateCommandCodec = t.type({
  long: possible(t.string),
  tags: possible(t.record(t.string, t.string)),
  params: possible(t.record(t.string, t.string)),
  metatags: possible(t.record(t.string, t.string)),
  dynamicConfig: possible(allDynamics)
})

// #endregion codecs
