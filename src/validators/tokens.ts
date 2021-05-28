import type { Evt } from '../types'
import type { ValidationTest } from '../funcs/validations'
import { user, IUser } from '../entities'
import { createHmac } from 'crypto'
import { btoa } from '../utils/base64'
import { pluckDataFor } from '../utils/pluckData'
import first from '../utils/first'
import { jwtVerify } from '../auths/validJWT'

// #region interfaces
import type { ILoginInfoInput } from '../funcs/tokens'

// type ReqdAuthZ = FullObject<authZ>
// type PartAuthZ = {
//   creds: Partial<ILoginInfoInput>
//   jwtUser: Partial<IUser>
// }
type AuthZFlatPartial = Partial<ILoginInfoInput & IUser>

// #endregion interfaces

// #region helpers
export const pluckAuthTokenFromEvent = (e:Evt) => first(
  [
    pluckDataFor('AuthorizationToken'),
    pluckDataFor('authorizationToken'),
    pluckDataFor('authToken'),
    pluckDataFor('authtoken'),
    pluckDataFor('auth'),
    pluckDataFor('token')
  ].map(f => f(e, undefined))
)

/**
*
* @param e
*/
export const pluckCredentialsFromEvent = (e:Evt): ILoginInfoInput => {
  const p = pluckDataFor('p')(e, null)
  return {
    email: pluckDataFor('email')(e, null),
    p: p === null ? null : btoa(p),
    TFAtype: pluckDataFor('TFAtype')(e, undefined),
    TFAchallengeResp: pluckDataFor('TFAchallengeResp')(e, undefined)
  }
}

export const makeSig = (creds:ILoginInfoInput, password: string):string => {
  return createHmac('sha256', password)
    .update(JSON.stringify(creds, Object.keys(creds).sort()))
    .digest('hex')
}

// #endregion helpers

// #region validators
export const emailNotProvided: ValidationTest<AuthZFlatPartial> = async (e, c, d) => {
  return {
    code: 400,
    reason: 'Email Not Provided',
    passed: !!d.email,
    InvalidDataLoc: '',
    InvalidDataVal: '',
    docRef: ''
  }
}

export const passIsProvidedAndValid: ValidationTest<AuthZFlatPartial> = async (e, c, d) => {
  if (d.p && d.email) {
    const u = await user.lookupVia({ typeID: 'email', exID: d.email })
    return {
      code: 400,
      reason: 'Password is Invalid For the Given Email',
      passed: await user.password.isValidForUser({ uacct: u.uacct, passwordPlainText: d.p }),
      InvalidDataLoc: '[H > Q > C].p',
      InvalidDataVal: 'Will Not show Password In PlainText',
      docRef: '##'
    }
  } else {
    return {
      code: 400,
      reason: 'Password is Not Provided',
      passed: false,
      InvalidDataLoc: '[H > Q > C].p',
      InvalidDataVal: 'Will Not show Password In PlainText',
      docRef: '##'
    }
  }
}

export const emailAddressInvalid: ValidationTest<AuthZFlatPartial> = async (e, c, d) => {
  const exID = d?.email ?? '' as string
  const u = await user.lookupVia({ typeID: 'email', exID })
    .catch(er => { return null })

  return {
    code: 400,
    reason: 'Email Address Is Not Found',
    passed: !!u,
    InvalidDataLoc: '',
    InvalidDataVal: '',
    docRef: ''
  }
}

export const authTokenNotProvided: ValidationTest<AuthZFlatPartial> = async (e, c, d) => {
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

export const authTokenInvalid: ValidationTest<AuthZFlatPartial> = async (e, c, d) => {
  const token = pluckAuthTokenFromEvent(e)
  const obj = await jwtVerify()(token).catch(er => null)

  return {
    code: 400,
    reason: 'Invalid Authorization Token',
    passed: !!obj,
    InvalidDataLoc: '[H>Q>C].authToken',
    InvalidDataVal: token,
    docRef: ''
  }
}

export const authTokenContainsValidUacct: ValidationTest<AuthZFlatPartial> = async (e, c, d) => {
  const token = pluckAuthTokenFromEvent(e)
  const tokenData = await jwtVerify()(token).catch(er => null)

  return {
    code: 400,
    reason: 'Cannot find a valid Uacct from the token',
    passed: !!tokenData?.uacct,
    InvalidDataLoc: '[H>Q>C].authToken',
    InvalidDataVal: JSON.stringify(tokenData),
    docRef: ''
  }
}

export const isTOTPChallengeValid: ValidationTest<AuthZFlatPartial> = async (e, c, d) => {
  if (d?.email) {
    user.lookupVia({ typeID: 'email', exID: d?.email })
    // abort not a validation needing to run
    // so just pass it based on non-applicable precondition
    return true
  } else {
    const challengeResp = d.TFAchallengeResp
    const TFAtype = d.TFAtype

    if (d.uacct) {
      if (TFAtype === 'TOTP') {
        return {
          code: 400,
          reason: 'Invalid TFA TOTP Challenge Response',
          passed: !!challengeResp && await user.otp.isValidOTP(d.uacct, challengeResp),
          InvalidDataLoc: 'H > Q > C',
          InvalidDataVal: challengeResp
        }
      } else if (TFAtype === 'U2F') {
        return {
          code: 400,
          reason: 'Invalid TFA Challenge - U2F is not yet implemented',
          passed: false,
          InvalidDataLoc: 'H > Q > C',
          InvalidDataVal: challengeResp
        }
      } else {
        return {
          code: 400,
          reason: 'Invalid TFA Type',
          passed: false,
          InvalidDataLoc: 'H > Q > C',
          InvalidDataVal: d.TFAtype
        }
      }
    } else {
      return {
        code: 400,
        reason: 'Cannot Find Valid User Account',
        passed: false,
        InvalidDataLoc: 'H > Q > C',
        InvalidDataVal: d.TFAtype
      }
    }
  }
}

// #endregion validators
