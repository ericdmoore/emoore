import type { JWTObjectOutput, Evt } from '../types'
import type { ValidationTest } from '../funcs/validations'
import type { ILoginInfoInput } from '../funcs/tokens'
import type { IUser } from '../entities'
//
import first from '../utils/first'
import { user } from '../entities'
import { createHmac } from 'crypto'
import { btoa } from '../utils/base64'
import { pluckDataFor } from '../utils/pluckData'
import { jwtVerify } from '../auths/validJWT'
import { hasElements } from '../utils/objectKeyCheck'

// #region interfaces


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
export const emailShouldBeProvided: ValidationTest<unknown> = async (e) => {
  const creds = pluckCredentialsFromEvent(e)

  return {
    code: 400,
    reason: 'Email Not Provided',
    passed: !!creds.email,
    InvalidDataLoc: '[H>Q>C].email',
    InvalidDataVal: creds.email ? creds.email : undefined,
    docRef: ''
  }
}

export const passShouldBeProvidedAndValid: ValidationTest<unknown> = async (e) => {
  const creds = pluckCredentialsFromEvent(e)

  if (creds.p && creds.email) {
    // validator does look up???
    const u = await user.lookupVia({ typeID: 'email', exID: creds.email })

    return {
      code: 400,
      reason: 'Password is Invalid For the Given Email',
      passed: !!u && await user.password.isValidForUser({ uacct: u.uacct, passwordPlainText: creds.p }),
      InvalidDataLoc: '[H > Q > C].p',
      InvalidDataVal: 'Will Not show Password In PlainText',
      docRef: '##'
    }
  } else {
    return {
      code: 400,
      reason: 'Password is Invalid For the Given Email',
      passed: false,
      InvalidDataLoc: '[H > Q > C].p',
      InvalidDataVal: 'Will Not show Password In PlainText',
      docRef: '##'
    }
  }
}

export const emailAddressShouldBeValid: ValidationTest<unknown> = async (e, c, d) => {
  const creds = pluckCredentialsFromEvent(e)

  const u = creds.email
    ? await user.lookupVia({ typeID: 'email', exID: creds.email })
    : await Promise.resolve(undefined)

  return {
    code: 400,
    reason: 'Email Address Is Not Found',
    passed: !!u,
    InvalidDataLoc: '',
    InvalidDataVal: '',
    docRef: ''
  }
}


export const emailCredentialShouldMatchTheEmailInTheAuthToken: ValidationTest<unknown> = async (e, c, d) => {
  const creds = pluckCredentialsFromEvent(e)
  const authTok = pluckAuthTokenFromEvent(e)
  const jwtUser = authTok ? await jwtVerify<JWTObjectOutput>()(authTok) : undefined

  return {
    code: 400,
    reason: 'Email Addresses Must Match',
    passed: jwtUser?.email 
      ? jwtUser.email === creds.email 
      : true,
    InvalidDataLoc: '[H>Q>C].authToken#email === [H>Q>C].email',
    InvalidDataVal: `${{email: creds?.email, authTokenEmail: jwtUser?.email}}`,
    docRef: ''
  }
}

export const authTokenShouldBeProvided: ValidationTest<unknown> = async (e) => {
  const authToken = pluckAuthTokenFromEvent(e)
  return {
    code: 400,
    reason: 'Authorization Token Not Provided',
    passed: !!authToken,
    InvalidDataLoc: '',
    InvalidDataVal: authToken,
    docRef: `    ]`
  }
}

export const authTokenShouldBeValid: ValidationTest<unknown> = async (e) => {
  const token = pluckAuthTokenFromEvent(e)
  const tokenObj = await jwtVerify()(token).catch(er => null)
  const doesVerify = !!tokenObj
  const hasAllElems = hasElements('uacct', 'email', 'maxl25')(tokenObj)

  if (token) {
    return {
      code: 400,
      reason: 'Invalid Authorization Token',
      passed: doesVerify && hasAllElems,
      InvalidDataLoc: '[H>Q>C].authToken',
      InvalidDataVal: token,
      docRef: ''
    }
  } else {
    // dont' validate if not passed in
    // use a `ShouldBeProvided` function for presence check
    return true
  }
}

export const authTokenShouldContainValidUacct = (sidecarKey:string): ValidationTest<unknown> => async (e) => {
  const token = pluckAuthTokenFromEvent(e)
  const tokenData = await jwtVerify<JWTObjectOutput>()(token).catch(er => null)
  const usr = tokenData?.uacct
    ? await user.getByID(tokenData.uacct).catch(er => undefined)
    : await Promise.resolve(undefined)

  const expensiveData = {[sidecarKey] :usr} as {[str:string] : unknown }
  const passed = !!usr 

  return {
    code: 400,
    reason: 'No User Exists by the given Uacct',
    passed,
    InvalidDataLoc: '[H>Q>C].authToken',
    InvalidDataVal: token,
    docRef: '#',
    ...(passed ? { expensiveData } : {})
  }
} 

export const challengeTOTPShouldBeValid: ValidationTest<AuthZFlatPartial> = async (e, c, d) => {
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
          reason: 'Invalid TFA TOTP Challenge Rxesponse',
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
