// import type * as k from '../types'
import { randomBytes } from 'crypto'
import { Entity } from 'dynamodb-toolbox'
import bcrypt from 'bcrypt'
import { nanoid } from 'nanoid'
import { authenticator } from 'otplib'
import * as base32 from 'hi-base32'
import { appTable, customTimeStamps } from './entities'
import { userLookup } from './userLookup'

// import { Fido2Lib } from 'fido2-library'
// import qrcode from 'qrcode'
// can add this if browser side it too difficult

// const h = require('fido2-helpers')

interface TwoFAStringSec {
   strategy: 'TOTP' | 'SMS'
   secret: string
   acctName: string
   label?:string
}
interface TwoFABufferSec {
  strategy: 'U2F'
  secret: Buffer
  acctName: string
  label?:string
}
type ITwoFactorOpt = TwoFAStringSec | TwoFABufferSec

export interface IUser{
  uacct: string
  email: string
  pwHash: string
  displayName: string
  oobTokens: ITwoFactorOpt[]
  backupCodes: string[]
  maxl25: string[]
  delegation?:{
    delegateFor: string[]
    revocableStartersTo: string[]
  }
  cts: number
  mts: number
  entity: 'user'
}

const createRandomBytes = (bytes:number):Promise<Buffer> => new Promise((resolve, reject) => {
  randomBytes(bytes, (er, d) => er ? reject(er) : resolve(d))
})

// const oneOf = async (...tests: (()=>Promise<boolean>)[]) => tests.reduce(
// async (p, c) => await p || await c(), Promise.resolve(false))
//
// const f2l = new Fido2Lib({ timeout: 60 })

export const user = {
  pk: (i:{uacct:string}) => `u#${decodeURIComponent(i.uacct)}`,
  sk: (i:{uacct:string}) => `u#${decodeURIComponent(i.uacct)}`,

  /**
   * @param attemptUacct
   * @readsDB to verify no collision
   */
  mintUserID: async (attemptUacct?:string): Promise<string> => {
    const tryUacct = attemptUacct ?? base32.encode(nanoid(15))
    const u = await user.getByID(tryUacct)
    if (u) {
      // retry, because collision found so re-attempt
      return user.mintUserID(`${attemptUacct}_${base32.encode(nanoid(15)).slice(0, 5)}`)
    } else {
      return tryUacct
    }
  },
  /**
   *
   * @param i
   * @readsDB 2x
   */
  lookupVia: async (i:{typeID:'phone'|'email', exID?:string | null}) => {
    if (i.exID) {
      const UserDyn = await userLookup.ent.get(i)
      return UserDyn.Item
        ? user.getByID(UserDyn.Item.uacct)
        : undefined
    } else {
      return undefined
    }
  },
  /**
   * @param uacct - User Account
   * @param typeID - ENUM email or phone
   * @param exID - external ID
   * @writesDB
   */
  addExternalID: async (uacct:string, typeID:'email'| 'phone', exID:string) => {
    const opts = { uacct, exID, typeID, isIDVerified: false }
    await userLookup.ent.put(opts)
    return opts
  },
  /**
   * @param uacct user account
   * @readsDB
   */
  getByID: async (uacct:string):Promise<IUser> =>
    user.ent.get({ uacct })
      .then(d => d.Item)
      .catch(er => {
        /* istanbul ignore next */
        throw new Error(er)
      }),
  genUser: async (
    uacctReq:string,
    plainTextPassword:string,
    email?:string,
    displayName?:string,
    delegateToUaccts: string[] = [],
    oobTokens: { strategy:string, uri:string, secret:string, label?:string }[] = [],
    backupCodes: string[] = []

  ) => {
    const uacct = await user.mintUserID(uacctReq)
    return {
      uacct,
      email,
      displayName,
      oobTokens: [...oobTokens, await user.otp.gen2FA(uacct, 'TOTP')],
      backupCodes: [...backupCodes, ...await user.otp.genBackups()],
      pwHash: await user.password.toHash(plainTextPassword),
      delegation: {
        delegateFor: [],
        revocableStartersTo: delegateToUaccts
      }
    }
  },
  password: {
    /**
     * @param passwordPlainText - plain text password
     * @param rounds - also called the bcrypt work factor
     * @pure
     */
    toHash: (passwordPlainText:string, rounds = 13) =>
      bcrypt.hash(passwordPlainText, rounds),
    /**
      * @param i.email
      * @param i.passwordPlanText
      * @readsDB
    */
    isValidForUser: async (i:{uacct:string, passwordPlainText: string}) =>
      bcrypt.compare(i.passwordPlainText, (await user.getByID(i.uacct)).pwHash)
  },
  otp: {
    isValidOTP: async (uacct: string, code: string) => {
      const [validBackupCode, validTOTP] = await Promise.all([
        user.otp.isValidBackUpCode(uacct, code),
        user.otp.isValidTOTP(uacct, code)
      ])
      return validBackupCode || validTOTP
    },
    /**
     * @param email
     * @param code
     * @readsDB
     * @note userland: if valid, please remove the used code
     */
    isValidBackUpCode: async (uacct: string, code: string) => {
      const u = await user.getByID(uacct)
      return (u.backupCodes as string[]).includes(code)
    },
    /**
     *
     */
    isValidU2F: async (uacct: string, challengeResp: string):Promise<boolean> => {
      //
      // @see : https://slides.com/fidoalliance/jan-2018-fido-seminar-webauthn-tutorial
      //
      // const u = await user.getByID(uacct)
      // const U2Fseeds = u.oobTokens.filter(v => v.strategy === 'U2F')
      //
      // const expected = {
      //   rpId: '',
      //   challenge: '',
      //   origin: 'https://localhost:8443',
      //   factor: 'either' as 'either',
      //   publicKey: h.lib.assnPublicKey,
      //   prevCounter: 362,
      //   userHandle: null
      // }
      // f2l.assertionResult(
      //   {
      //     // id?: ArrayBuffer;
      //     // rawId?: ArrayBuffer;
      //     response: {
      //       clientDataJSON: 'string',
      //       authenticatorData: Buffer.from(''),
      //       signature: 'string'
      //       // userHandle?: 'string'
      //     }
      //   }, expected
      // )
      //   .then(d => d.audit.validRequest)
      //   .catch(er => false)

      // not yet implemented
      return false
    },
    /**
     * @param email
     * @param TOTPcode
     * @readsDB
     */
    isValidTOTP: async (uacct: string, TOTPcode: string) => {
      const u = await user.getByID(uacct)
      return (u.oobTokens as ITwoFactorOpt[])
        .reduce(
          (p, oob) => p || authenticator.check(TOTPcode, oob.secret.toString()),
          false
        )
    },
    /**
     * @param backUpCodeLen
     * @note userland: please save these to a user
     * @pure
     */
    genBackups: async (backUpCodeLen: number = 8, codeLen = 12) => {
      return Array(backUpCodeLen).fill(0).map(v => nanoid(codeLen))
    },
    /**
     * @param email
     * @param strategy For now only TOTP is supported
     * @pure
     * @note Please Save the secret
     */
    gen2FA: async (uacct:string, strategy :'TOTP' | 'SMS' | 'U2F' = 'TOTP', label?: string) => {
      if (strategy === 'TOTP') {
        const { secret } = await user.otp.createTOTPOption()
        const uri = authenticator.keyuri(uacct, 'emoo.re', secret)
        return { strategy, uri, secret, label }
      } else if (strategy === 'SMS') {
        const secret = base32.encode(nanoid(5)).slice(0, 6)
        const jwt = `somejwt.including.${uacct}`
        const uri = `https://login.emoo.re?authToken=${jwt}`
        return { strategy, uri, secret, label }
      } else if (strategy === 'U2F') {
        const secret = await createRandomBytes(32)
        const uri = 'read more docs to see if can be used for server challenge'
        return { strategy, uri, secret, label }
      } else {
        /* istanbul ignore next */
        throw new Error('Invalid strategy type')
      }
    },
    /**
     * @pure
     */
    createTOTPOption: async () => ({
      strategy: 'TOTP',
      secret: authenticator.generateSecret()
    })
  },
  ent: new Entity({
    table: appTable,
    name: 'user',
    timestamps: false,
    attributes: customTimeStamps({
      uacct: { type: 'string' },
      email: { type: 'string' },
      delegation: { type: 'map' },
      displayName: { type: 'string' },
      oobTokens: { type: 'list' }, // { strategy, uri, secret, label }[]
      backupCodes: { type: 'set', setType: 'string' },
      pwHash: { type: 'string' },
      pk: { hidden: true, partitionKey: true, dependsOn: 'uacct', default: (data:any) => user.pk(data) },
      sk: { hidden: true, sortKey: true, dependsOn: 'uacct', default: (data:any) => user.sk(data) }
    })
  })
}

export default user
