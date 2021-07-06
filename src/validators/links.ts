import type { IFunc, Responder, SRet, Evt } from '../types'
import pluckDataFor from '../utils/pluckData'
import JSON5 from 'json5'
import {
    authTokenShouldBeProvided, 
    authTokenShouldBeValid
} from '../validators/tokens'

import type {ValidationTest} from '../funcs/validations'
// #region plucker

/**
*
* @param e
* @pluck paths - raw string no slashes 
*/
export const pluckLinkPaths = (e:Evt) => {
    const paths = pluckDataFor('paths')(e, [] as string[])
    return {
      paths: typeof paths === 'string' 
        ? JSON5.parse(paths) as string[] 
        : paths,
    }
  }

// #endregion plucker

// #region validators
  
export const linksAreProvided: ValidationTest<unknown> = async (e, c, d) => {
  return {
    code: 400,
    reason: 'A reason',
    passed: true,
    InvalidDataLoc: '',
    InvalidDataVal: '',
    docRef: ''
  }
}
export const allLinksAreValid: ValidationTest<unknown> = async (e, c, d) => {
  return {
    code: 400,
    reason: 'A reason',
    passed: true,
    InvalidDataLoc: '',
    InvalidDataVal: '',
    docRef: ''
  }
}

// #endregion validators