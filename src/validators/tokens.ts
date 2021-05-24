import type { Evt } from '../types'
import type { ValidationTest } from '../funcs/validations'
import { user } from '../entities'
import { createHmac } from 'crypto'
import { btoa } from '../utils/base64'
import { pluckDataFor } from '../utils/pluckData'
import first from '../utils/first'

// #region interfaces
export interface ILoginInfoInput{
    email: string | null
    TFAtype?: string
    TFAchallengeResp?: string
    sig: string | null
}

interface authZ {
    creds: ILoginInfoInput
}
// #endregion interfaces

// #region helpers
const pluckAuthTokenFromEvent = (e:Evt) => first(
  [
    pluckDataFor('AuthorizationToken'),
    pluckDataFor('authorizationToken'),
    pluckDataFor('authToken'),
    pluckDataFor('authtoken'),
    pluckDataFor('auth'),
    pluckDataFor('token')
  ].map(f => f(e, undefined))
)

export const makeSig = (creds:ILoginInfoInput, password: string):string => {
  return createHmac('sha256', password)
    .update(JSON.stringify(creds, Object.keys(creds).sort()))
    .digest('hex')
}

export const isSigValid = (creds:ILoginInfoInput, base64password: string):boolean => {
  return creds.sig === null || creds.email == null
    ? false
    : creds.sig === makeSig(creds, btoa(base64password))
}

// #endregion helpers

// #region validators
export const emailNotProvided: ValidationTest<authZ> = async (e, c, d) => {
  const creds = d.creds
  return {
    code: 400,
    reason: 'Email Not Provided',
    passed: creds.email !== null,
    InvalidDataLoc: '',
    InvalidDataVal: '',
    docRef: ''
  }
}

export const emailAddressInvalid: ValidationTest<authZ> = async (e, c, d) => {
  const creds = d.creds

  const u = await user.lookupVia({ typeID: 'email', exID: creds.email as string })
    .catch(er => { return null })
  console.log({ u })

  return {
    code: 400,
    reason: 'Email Address Is Not Found',
    passed: !!u,
    InvalidDataLoc: '',
    InvalidDataVal: '',
    docRef: ''
  }
}

export const sigNotProvided: ValidationTest<authZ> = async (e, c, d) => {
  const creds = d.creds
  return {
    code: 400,
    reason: 'Signature Not Provided',
    passed: creds.sig !== null,
    InvalidDataLoc: '',
    InvalidDataVal: '',
    docRef: ''
  }
}

export const sigInvalid: ValidationTest<authZ> = async (e, c, d) => {
  const creds = d.creds

  const u = await user.lookupVia({ typeID: 'email', exID: creds.email as string })
    .catch(er => { return null })

  return {
    code: 400,
    reason: 'Invalid Signature',
    passed: !u ? false : isSigValid(creds, u.pwHash),
    InvalidDataLoc: '',
    InvalidDataVal: '',
    docRef: `To Make a signature 
      str = JSON.stringify({email, TFAtoken, TFAtype}),
      and then make an HMAC string using the 'sha-256' alogorithm and where the secret value = base64(password)
      `
  }
}

export const authTokenNotProvided: ValidationTest<authZ> = async (e, c, d) => {
  const authToken = pluckAuthTokenFromEvent(e)
  return {
    code: 400,
    reason: 'Authorization Token Not Provided',
    passed: !!authToken,
    InvalidDataLoc: '',
    InvalidDataVal: authToken,
    docRef: `Check Locations :: Headers > QuderyString > Cookies.
    Then look for the most specific version of Authorization Tokens, 
    where capitalization and full spelling make a version more specific. 
    
    Top line is most prefered
    
    [
      'AuthorizationToken'
      'authorizationToken'
      'authToken'
      'authtoken'
      'auth'
      'token'
    ]`
  }
}

export const authTokenInvalid: ValidationTest<authZ> = async (e, c, d) => {
  const creds = d.creds

  const u = await user.lookupVia({
    typeID: 'email',
    exID: creds.email as string
  }).catch(er => { return null })

  return {
    code: 400,
    reason: 'Invalid Signature',
    passed: !u ? false : isSigValid(creds, u.pwHash),
    InvalidDataLoc: '',
    InvalidDataVal: '',
    docRef: `To Make a signature 
      str = JSON.stringify({email, TFAtoken, TFAtype}),
      and then make an HMAC string using the 'sha-256' alogorithm and where the secret value = base64(password)
      `
  }
}

// #endregion validators
