// import type * as k from '../types'
import { appTable, customTimeStamps } from './entities'
import { Entity } from 'dynamodb-toolbox'
import bcrypt from 'bcrypt'
import { nanoid } from 'nanoid'
import { authenticator } from 'otplib'

// import qrcode from 'qrcode'
// can add this if browser side it too difficult

interface oobToken {
   strategy: 'TOTP' | 'U2F'
   secret: string
   acctName: string
}

export const user = {
  pk: (i:{email:string}) => `u#${decodeURIComponent(i.email)}`,
  sk: (i:{email:string}) => `u#${decodeURIComponent(i.email)}`,
  getViaEmail: async (i:{email:string}) => (await user.ent.get({ email: i.email })).Item,
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
    isValidForUser: async (i:{email:string, passwordPlainText: string}) =>
      bcrypt.compare(i.passwordPlainText, (await user.getViaEmail(i)).pwHash)
  },
  otp: {
    isValidOTP: async (email: string, code: string) => {
      const [validBackupCode, validTOTP] = await Promise.all([
        user.otp.isValidBackUpCode(email, code),
        user.otp.isValidTOTP(email, code)
      ])
      return validBackupCode || validTOTP
    },
    /**
     * @param email
     * @param code
     * @readsDB
     * @note userland: if valid, please remove the used code
     */
    isValidBackUpCode: async (email: string, code: string) => {
      const u = await user.getViaEmail({ email })
      return (u.backupCodes as string[]).includes(code)
    },
    /**
     * @param email
     * @param TOTPcode
     * @readsDB
     */
    isValidTOTP: async (email: string, TOTPcode: string) => {
      const u = await user.getViaEmail({ email })
      return (u.oobTokens as oobToken[])
        .reduce((p, oob) => p && authenticator.check(TOTPcode, oob.secret), true)
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
    gen2FA: async (email:string, strategy = 'TOTP') => {
      const { secret } = await user.otp.createTOTPOption()
      const uri = authenticator.keyuri(email, 'emoo.re', secret)
      return { strategy, uri, secret }
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
      displayName: { type: 'string' },
      oobTokens: { type: 'list' },
      backupCodes: { type: 'set', setType: 'string' },
      email: { type: 'string' },
      pwHash: { type: 'string' },
      pk: { hidden: true, partitionKey: true, dependsOn: 'email', default: (data:any) => user.pk(data) },
      sk: { hidden: true, sortKey: true, dependsOn: 'email', default: (data:any) => user.sk(data) }
    })
  })
}

export default user
