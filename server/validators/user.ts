import type { ValidationTest } from '../funcs/validations'
import type { Evt } from '../types'
import type { FlatPostUserInfo } from '../funcs/users'
import { user } from '../entities'
import { acceptanceToken } from '../auths/tokens'
// import first from '../utils/first'
import { deepStrictEqual } from 'assert'
import { pluckDataFor } from '../utils/pluckData'
import { hasElements } from '../utils/objectKeyCheck'
import { btoa } from '../utils/base64'
// import { btoa } from '../utils/base64'

const deepEq = (a:any, o:any) => {
  try { deepStrictEqual(a, o); return true } catch (e) { return false }
}

/**
 * An Acceptance Token is the mechanism where new users
 * can be approved by the people/the system and be sent an invation link
 * that holds the approved information - and the users would then
 * create/confirm their account by logging in :)
 * @param e
 */
export const pluckAcceptanceToken = (e:Evt) => pluckDataFor('acceptanceToken')(e, undefined)

export const pluckUserSetupInfo = (e:Evt) => {
  const auto = pluckDataFor('auto')(e, undefined)
  const email = pluckDataFor('email')(e, undefined)
  const passwordPlainText = pluckDataFor('passwordPlainText')(e, undefined)
  const displayName = pluckDataFor('displayName')(e, undefined)
  const uacct = pluckDataFor('uacct')(e, undefined)

  return {
    uacct,
    auto: auto === '1' || auto === 'true',
    email: email ? decodeURIComponent(email) : undefined,
    displayName: displayName ? decodeURIComponent(displayName) : undefined,
    passwordPlainText: passwordPlainText ? btoa(passwordPlainText) : undefined
  }
}

export const pluckUpdateFields = (e:Evt) => {
  const email = pluckDataFor('newEmail')(e, undefined)
  const passwordPlainText = pluckDataFor('newPasswordPlainText')(e, undefined)
  const displayName = pluckDataFor('newDisplayName')(e, undefined)
  const refreshBackupCodes = !!pluckDataFor('refreshBackupCodes')(e, undefined)
  const addTOTP = pluckDataFor('addTOTP')(e, undefined) // label
  const rmTOTP = pluckDataFor('rmTOTP')(e, undefined) // label

  return {
    displayName: displayName ? decodeURIComponent(displayName) : undefined,
    email: email ? decodeURIComponent(email) : undefined,
    passwordPlainText: passwordPlainText ? btoa(passwordPlainText) : undefined,
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
    atob( [H>Q>C].newPasswordPlainText )
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
    userInfo.email ? user.lookupVia({ typeID: 'email', exID: userInfo.email }) : Promise.resolve(undefined)
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
    InvalidDataLoc: keys.map(k => `[H>Q>C].${k})`).join(', '),
    InvalidDataVal: '',
    docRef: ''
  }
}

export const acceptanceTokenSigShouldMatchInlineInfo: ValidationTest<FlatPostUserInfo> = async (e, c, d) => {
  const { acceptanceTok, ...uInfo } = d
  const { obj } = await acceptanceToken().fromString(acceptanceTok ?? '')

  // const { auto, ...userInfo } = pluckUserSetupInfo(e)

  const passed = deepEq({
    uacct: obj.uacct,
    email: obj.email,
    passwordPlainText: obj.passwordPlainText
  }, {
    uacct: uInfo.uacct,
    email: uInfo.email,
    passwordPlainText: uInfo.passwordPlainText
  })

  // console.log({ obj, uInfo, passed })

  // console.log({ accTokenObj, userInfo })
  // console.log({ passed })

  return {
    code: 400,
    passed,
    reason: 'The AcceptanceToken and the Information Provided DONOT Match',
    InvalidDataLoc: '[H>Q>C].authToken, [H>Q>C].email,  [H>Q>C].displayName, [H>Q>C].plaintextPassword',
    InvalidDataVal: JSON.stringify(uInfo),
    docRef: ''
  }
}
