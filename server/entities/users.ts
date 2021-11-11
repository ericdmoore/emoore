// import type * as k from '../types'
import type { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { randomBytes } from 'crypto'
import { Entity } from 'dynamodb-toolbox'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import { authenticator } from 'otplib'
import { encode as encodeB32 } from 'hi-base32'
import { appTable, customTimeStamps } from './entities'
import { userLookup } from './userLookup'
import { batch } from '../utils/ranges/batch'

// import { Fido2Lib } from 'fido2-library'
// import qrcode from 'qrcode'
// can add this if browser side it too difficult

// const h = require('fido2-helpers')
interface IOobTokenInput{
  strategy: 'TOTP' | 'SMS' | 'U2F'
  uri:string
  secret:string
  label?:string
}

interface TwoFAStringSec {
   strategy: 'TOTP' | 'SMS'
   secret: string
   uri: string
   // acctName: string use-displayName
   label?: string
}

interface TwoFAfido20 {
  strategy: 'U2F'
  secret: string // semicolonX2 separated values - [secValue;; pubKey;; cert?]
  uri: string
  label?: string

  keyHandle: string // keyID aka key-handle in the USB
  pubKey: string | null
  cert: string | null
  counter?: number // RP verifies that the counter is hifgher than last time
}
type ITwoFactorOpt = TwoFAStringSec | TwoFAfido20

export interface UserBase{
  email: string
  passwordPlainText: string
  displayName?:string
  uacct?: string
  oobTokens?: IOobTokenInput[]
  backupCodes?: string[]
  last25?: string[]
}

// @ref overview:  https://developers.yubico.com/U2F/Protocol_details/Overview.html
// @ref python implementation: https://github.com/Yubico/python-fido2/blob/master/examples/server/server.py

export interface IUser{
  uacct: string
  email: string // merely for display convenience - not for look up - for that, use the "userLookup" entity
  pwHash: string
  displayName: string
  oobTokens: ITwoFactorOpt[]
  backupCodes: string[]
  last25: string[]
  // delegation?:{ // should we rmeove this all together - how useful is this for links?
  //   operateFor: string[] // i can do things for these people -- {uacct: string, roles:string[], starterToken:string}
  //   revocableStartersTo: string[] // // these people can help me -- {uacct: string, roles:string[], starterToken:string}
  // }
  cts: number
  mts: number
  entity: 'user'
}

const createRandomBytes = (bytes:number): Promise<Buffer> => new Promise((resolve, reject) => {
  randomBytes(bytes, (er, d) => er ? reject(er) : resolve(d))
})

const toOOBtokens = (uacct:string, i:IOobTokenInput[]): Promise<ITwoFactorOpt[]> => {
  return Promise.all(
    i.map(oob => user.otp.gen2FA(uacct, oob))
  )
}

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
    const tryUacct = attemptUacct ?? encodeB32(nanoid(15))
    const u = await user.getByID(tryUacct)
    if (u) {
      // retry, because collision found so re-attempt
      return user.mintUserID(`${attemptUacct}_${encodeB32(nanoid(15)).slice(0, 5)}`)
    } else {
      return tryUacct
    }
  },
  /**
   *
   * @param i
   * @readsDB 2x
   */
  lookupVia: async (i:{typeID:'phone'|'email', exID?:string | null}): Promise<IUser | undefined> => {
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
  externalIDs: {
    add: async (uacct:string, typeID:'email'| 'phone', exID:string) => {
      const opts = { uacct, exID, typeID, isIDVerified: false }
      await userLookup.ent.put(opts)
      return opts
    },
    verify: async (uacct:string, typeID:'email'| 'phone', exID:string) => {
      const opts = { uacct, exID, typeID, isIDVerified: true }
      await userLookup.ent.update(opts)
      return opts
    },
    rm: async (uacct:string, typeID:'email'| 'phone', exID:string) => {
      await userLookup.ent.delete({ uacct, exID, typeID })
      return null
    }
  },
  /**
   * @param uacct user account
   * @readsDB
   */
  getByID: async (uacct?:string):Promise<IUser> =>
    !uacct
      ? undefined
      : user.ent.get({ uacct }, { consistent: true })
        .then(d => d.Item),
  /**
   * @writesDB
   * @param email -
   * @param passwordPlainText
   * @param uacctInput
   * @param displayName
   * @param delegateToUaccts
   * @param oobTokenInputs
   * @param backupCodeInputs
   */
  genUser: async (
    opts:{
      email: string,
      passwordPlainText: string,
      uacct?: string,
      displayName?: string,
      oobTokens?: IOobTokenInput[],
      backupCodes?: string[],
      last25?:string[]
    }
  ) => {
    const uacct = await user.mintUserID(opts?.uacct)
    const pwHash = await user.password.toHash(opts.passwordPlainText)
    const oobTokens:ITwoFactorOpt[] = [
      ...await toOOBtokens(uacct, opts?.oobTokens ?? []),
      await user.otp.gen2FA(uacct, { strategy: 'TOTP' })
    ]
    const backupCodes = [...opts?.backupCodes ?? [], ...await user.otp.genBackups()]
    const last25 = [...opts?.last25 ?? []]

    // do delegation here?
    // then save with set add externalID
    //
    // console.log({ uacct, email: opts.email, displayName: opts?.displayName, oobTokens, backupCodes, pwHash, last25})

    return {
      uacct,
      email: opts.email,
      displayName: opts?.displayName,
      oobTokens,
      backupCodes,
      pwHash,
      last25,
      save: async () => {
        await user.ent.put({ uacct, email: opts.email, displayName: opts?.displayName, oobTokens, backupCodes, pwHash, last25 })
        await user.addExternalID(uacct, 'email', opts.email)
      }
    }
  },
  batch: {
    transact: async (items: DocumentClient.TransactWriteItemList,
      opts : { ReturnConsumedCapacity?: string, ReturnItemCollectionMetrics?: string, ClientRequestToken?: string
      } = { ReturnConsumedCapacity: 'TOTAL', ReturnItemCollectionMetrics: 'SIZE' }
    ):Promise<DocumentClient.TransactWriteItemsOutput> => {
      return new Promise((resolve, reject) => {
        return user.ent.DocumentClient.transactWrite({ ...opts, TransactItems: items },
          (err, data) => {
            // retry logic goes here
            err ? reject(err) : resolve(data)
          }
        )
      })
    },
    /**
     * @note max len = 12 items in array
     */
    put: async (...userList : UserBase[]) => {
      const byTheDozens = batch(12)
      // const acc = []
      for (const dozenUsers of byTheDozens(userList)) {
        await user.ent.table.batchWrite(
          [
            ...await Promise.all(
              dozenUsers.map(async (u, i) => {
                const { save, ...usr } = await user.genUser(u)
                return user.ent.putBatch(usr)
              })),
            ...await Promise.all(
              dozenUsers.map(async u =>
                userLookup.ent.putBatch(
                  {
                    // because the user.addExternal already runs this side-effect
                    uacct: u.uacct,
                    exID: u.email,
                    typeID: 'email',
                    isIDVerified: false
                  }
                )
              )
            )
          ]
        )
        // acc.push(r)
      }
      // return acc
    },
    rm: async (...userList:UserBase[]) => Promise.all([
      user.ent.table.batchWrite(userList.map(u => user.ent.deleteBatch(u))),
      user.ent.table.batchWrite(userList.map(u => userLookup.ent.deleteBatch({ exID: u.email, typeID: 'email' })))
    ]),
    get: async (...userList:UserBase[]) => user.ent.table.batchGet(userList.map(u => user.ent.getBatch(u)))
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
      return Array.from({ length: backUpCodeLen }, (v) => nanoid(codeLen))
    },
    /**
     * @param email
     * @param strategy For now only TOTP is supported
     * @pure
     * @note Please Save the secret
     */
    gen2FA: async (uacct:string, opts: {
      strategy :'TOTP' | 'SMS' | 'U2F',
      uri?:string,
      secret?:string,
      label?: string} =
    { strategy: 'TOTP' }):Promise<ITwoFactorOpt> => {
      if (opts.strategy === 'TOTP') {
        const secret = opts.secret
          ? opts.secret
          : (await user.otp.createTOTPOption()).secret
        return {
          strategy: 'TOTP',
          secret,
          label: opts.label,
          uri: opts.uri ?? authenticator.keyuri(uacct, 'emoo.re', secret)
        }
      } else if (opts.strategy === 'SMS') {
        const secret = encodeB32(nanoid(5)).slice(0, 6)
        const jwt = `someJWT.withSecret${secret}and${uacct}.bakedin`
        return {
          strategy: 'SMS',
          secret,
          label: opts.label,
          uri: `https://login.emoo.re?authToken=${jwt}`
        }
      } else if (opts.strategy === 'U2F') {
        return {
          strategy: 'U2F',
          uri: 'https://emoore.re',
          secret: `${await createRandomBytes(32)};;`, // secret;; puKey;; cert
          label: opts.label,
          keyHandle: 'keyID', // keyID aka key-handle in the USB
          pubKey: 'RSA...',
          cert: 'RSA...',
          counter: 42
        }
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
    }),
    expireBackupCode: async (uacct: string | IUser, deleteMeCode: string) => {
      const u :IUser = typeof uacct === 'string'
        ? await user.getByID(uacct)
        : uacct

      const priorNumCodes = u.backupCodes?.length ?? []

      // may not find it - since the secret value might be a TOTP - thus this call would be a no-op
      const backUpCodeIdx = (u?.backupCodes ?? []).findIndex((backupcode, i) => backupcode === deleteMeCode)

      // console.log({ backupCodes: u?.backupCodes ?? [], code: deleteMeCode, backUpCodeIdx})

      if (backUpCodeIdx !== -1) {
        const updateCmd = {
          uacct: u.uacct,
          backupCodes: { $remove: [backUpCodeIdx] }
        }
        await user.ent.update(updateCmd)
        return { u, tokenCount: priorNumCodes - 1 }
      } else {
        return { u, tokenCount: priorNumCodes }
      }
    }
  },
  ent: new Entity({
    table: appTable,
    name: 'user',
    timestamps: false,
    attributes: customTimeStamps({
      uacct: { type: 'string' },
      email: { type: 'string' },
      // delegation: { type: 'map' }, // @see IUser
      // what if delegation was done via macaroons anyway?
      //
      // groupMembership : { type: 'set', setType: 'string' }, // @see groupsHaveRolePrivelges
      // withRoles : { type: 'set', setType: 'string' }, // @see groupsHaveRolePrivelges
      displayName: { type: 'string' },
      pwHash: { type: 'string' },
      oobTokens: { type: 'list' }, // { strategy, uri, secret, label }[]
      backupCodes: { type: 'list', default: [] },
      last25: { type: 'list', default: [] },
      pk: { hidden: true, partitionKey: true, dependsOn: 'uacct', default: (data:any) => user.pk(data) },
      sk: { hidden: true, sortKey: true, dependsOn: 'uacct', default: (data:any) => user.sk(data) }
    })
  })
}

export default user
