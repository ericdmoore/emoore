// import type * as k from '../types'
import { appTable, customTimeStamps } from './entities'
import { Entity } from 'dynamodb-toolbox'
import bcrypt from 'bcrypt'
import { nanoid } from 'nanoid'
import { authenticator } from 'otplib'
import * as base32 from 'hi-base32'
import { randomBytes } from 'crypto'
import { userLookup } from './userLookup'

// import qrcode from 'qrcode'
// can add this if browser side it too difficult

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
  uacct:string
  pwHash:string
  displayName:string
  oobTokens: ITwoFactorOpt[]
  backupCodes: string[]
  maxl25:string[]
}

const createRandomBytes = (bytes:number):Promise<Buffer> => new Promise((resolve, reject) => {
  randomBytes(bytes, (er, d) => er ? reject(er) : resolve(d))
})

export const user = {
  pk: (i:{uacct:string}) => `u#${decodeURIComponent(i.uacct)}`,
  sk: (i:{uacct:string}) => `u#${decodeURIComponent(i.uacct)}`,
  mintUserID: async (attemptUacct?:string): Promise<string> => {
    const tryUacct = attemptUacct ?? base32.encode(nanoid(15))
    const u = await user.getByID(tryUacct)
    if (u) {
      // collision found so re-attempt
      return user.mintUserID()
    } else {
      return tryUacct
    }
  },
  lookupVia: async (i:{typeID:'phone'|'email', exID:string}) => {
    const { uacct } = (
      await userLookup.ent.get(i).catch(er => { throw new Error(er) })
    ).Item
    return user.getByID(uacct)
  },
  addExternalID: async (uacct:string, typeID:'email'| 'phone', exID:string) => {
    const opts = { uacct, exID, typeID, isIDVerified: false }
    await userLookup.ent.put(opts)
    return opts
  },
  getByID: async (uacct:string):Promise<IUser> =>
    user.ent.get({ uacct })
      .then(d => d.Item)
      .catch(er => {
        /* istanbul ignore next */
        throw new Error(er)
      }),
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
     * @param email
     * @param TOTPcode
     * @readsDB
     */
    isValidTOTP: async (uacct: string, TOTPcode: string) => {
      const u = await user.getByID(uacct)
      return (u.oobTokens as ITwoFactorOpt[])
        .reduce((p, oob) => p || authenticator.check(TOTPcode, oob.secret.toString()), false)
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
     * @note Please Save the secret,
     * @pure
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
      displayName: { type: 'string' },
      oobTokens: { type: 'list' },
      backupCodes: { type: 'set', setType: 'string' },
      pwHash: { type: 'string' },
      pk: { hidden: true, partitionKey: true, dependsOn: 'uacct', default: (data:any) => user.pk(data) },
      sk: { hidden: true, sortKey: true, dependsOn: 'uacct', default: (data:any) => user.sk(data) }
    })
  })
}

export default user
