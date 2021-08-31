import type { ValidationTest } from '../funcs/validations'
import type { Evt } from '../types'
import type { FlatPostUserInfo, IAcceptanceTokenOutput } from '../funcs/users'
import { user } from '../entities'
import { jwtVerify } from '../auths/validJWT'
import first from '../utils/first'
import { deepStrictEqual } from 'assert'
import { pluckDataFor } from '../utils/pluckData'
import { hasElements } from '../utils/objectKeyCheck'
import { btoa } from '../utils/base64'
// import { btoa } from '../utils/base64'

const verify = jwtVerify<IAcceptanceTokenOutput>()
const deepEq = (a:any, o:any) => {
  try { deepStrictEqual(a, o); return true } catch (e) { return false }
}

export const pluckAcceptanceToken = (e:Evt) => first(
  [
    pluckDataFor('acceptanceToken'),
    pluckDataFor('token')
  ].map(f => f(e, undefined))
)

export const pluckUserSetupInfo = (e:Evt) => {
  const auto = pluckDataFor('auto')(e, undefined)
  const email = pluckDataFor('email')(e, undefined)
  const plaintextPassword = pluckDataFor('plaintextPassword')(e, undefined)
  const displayName = pluckDataFor('displayName')(e, undefined)
  const uacct = pluckDataFor('uacct')(e, undefined)

  return {
    auto: auto === '1' || auto === 'true',
    email: email ? decodeURIComponent(email) : undefined,
    displayName: displayName ? decodeURIComponent(displayName) : undefined,
    plaintextPassword: plaintextPassword ? btoa(plaintextPassword) : undefined,
    uacct,
  }
}

export const pluckUpdateFields = (e:Evt) => {
  const email = pluckDataFor('newEmail')(e, undefined)
  const plaintextPassword = pluckDataFor('newPlaintextPassword')(e, undefined)
  const displayName = pluckDataFor('newDisplayName')(e, undefined)
  const refreshBackupCodes = !!pluckDataFor('refreshBackupCodes')(e, undefined)
  const addTOTP = pluckDataFor('addTOTP')(e, undefined) // label
  const rmTOTP = pluckDataFor('rmTOTP')(e, undefined) // label

  return {
    displayName: displayName ? decodeURIComponent(displayName) : undefined,
    email: email ? decodeURIComponent(email) : undefined,
    plaintextPassword: plaintextPassword ? btoa(plaintextPassword) : undefined,
    refreshBackupCodes,
    addTOTP,
    rmTOTP
  }
}

export const pluckDeleteFields = (e:Evt) => {
  const rmUacctID = pluckDataFor('rmUacct')(e, undefined) //  uacctID
  const rmDelegateToken = pluckDataFor('rmDelegationToken')(e, undefined) // delegateToken
  const rmTOTPlabel = pluckDataFor('rmTOTP')(e, undefined) // TOTP-label
  return { rmUacctID, rmDelegateToken, rmTOTPlabel }
}

export const reqHasUpdatableFields: ValidationTest<Partial<FlatPostUserInfo>> = async (e) => {
  const userUdpateFields = pluckUpdateFields(e)

  return {
    code: 400,
    reason: 'Please provide a field(s) for updating',
    passed: Object.values(userUdpateFields).length > 0,
    InvalidDataLoc: `    
    atob( [H>Q>C].newPlaintextPassword )
    urlEncoded( [H>Q>C].newEmail )
    urlEncoded( [H>Q>C].newDisplayName )
    [H>Q>C].addBackupCodes = 'true'  (or omit) 
    [H>Q>C].addTOTP = 'true' (or omit)
    [H>Q>C].refreshBackupCodes = 'true' (or omit)
    `,
    InvalidDataVal: '',
    docRef: ''
  }
}


export const userShouldNotPrexist: ValidationTest<Partial<FlatPostUserInfo>> = async (e) => {
  const userInfo = pluckUserSetupInfo(e)

  const [uByEmail, uByUacct] = await Promise.all([
    userInfo.uacct ? user.getByID(userInfo.uacct) : Promise.resolve(undefined),
    userInfo.email ? user.lookupVia({typeID:'email',exID: userInfo.email}) : Promise.resolve(undefined)
  ])

  return {
    code: 400,
    reason: 'User Account Already Exists : Please use an email that is not in use; If you request a specific uacct, it must also be avialable',
    passed: !uByEmail && !uByUacct,
    InvalidDataLoc: '[H>Q>C].uacct',
    InvalidDataVal: '',
    docRef: ''
  }
}


export const hasAllRequiredFields = (keys:string[], reason:string): ValidationTest<FlatPostUserInfo> => async (e) => {
  return {
    code: 400,
    reason,
    passed: hasElements(...keys)(pluckUserSetupInfo(e)),
    InvalidDataLoc: keys.map(k=>`[H>Q>C].${k})`).join(', '),
    InvalidDataVal: '',
    docRef: ''
  }
}

export const acceptanceTokenSigShouldMatchInlineInfo: ValidationTest<FlatPostUserInfo> = async (e, c, d) => {
  const accTokenStr = pluckAcceptanceToken(e)
  const {
    alg,
    typ,
    kid,
    iat,
    exp,
    iss,
    sub,
    aud,
    nbf,
    jti, 
    ...accTokenObj
  } = await verify(accTokenStr).catch(() => ({
    iat: null,
    exp: null,
    iss: null,
    alg: null,
    typ: null,
    kid: null,
    sub: null,
    aud: null,
    nbf: null,
    jti: null,
    email: undefined,
    displayName: undefined,
    plaintextPassword: undefined,
    uacct: undefined
  }))
  const { auto, ...userInfo } = pluckUserSetupInfo(e)

  const passed = deepEq({
    email: accTokenObj.email,
    displayName: accTokenObj.displayName,
    plaintextPassword: accTokenObj.plaintextPassword
  }, {
    email: userInfo.email,
    displayName: userInfo.displayName,
    plaintextPassword: userInfo.plaintextPassword
  })
  
  // console.log({ accTokenObj, userInfo })
  // console.log({ passed })


  return {
    code: 400,
    reason: 'The AcceptanceToken and the Information Provided DONOT Match',
    passed,
    InvalidDataLoc: `[H>Q>C].authToken, [H>Q>C].email,  [H>Q>C].displayName, [H>Q>C].plaintextPassword`,
    InvalidDataVal: JSON.stringify(userInfo),
    docRef: ''
  }
}
