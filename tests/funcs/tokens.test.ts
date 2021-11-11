/* globals test describe expect beforeAll afterAll */

/*
Overview
=============
* POST :: user -> starterToken -> (+2FA?)-> token
* POST :: user + delegation User -> delegation starterToken
* GET :: token -> tokens
* PUT :: token -> token
* DELE :: token -> confimationMessage
*/

import type { SRet } from '../../server/types'
// import type { UseBase } from '../../server/entities/users'
import handler from '../../server/funcs/tokens'
import { user } from '../../server/entities'
import { event, ctx } from '../gatewayData'
import { nanoid } from 'nanoid'
// import { userLookup } from '../../server/entities/userLookup'
import { atob } from '../../server/utils/base64'
import { accessToken } from '../../server/auths/tokens'
import { authenticator } from 'otplib'

const sleep = (n:number) => new Promise((resolve, reject) => {
  setTimeout(() => resolve(n), n)
})

const userList = [
  {
    uacct: nanoid(12),
    email: 'tokens.user1@example.com',
    displayName: 'Yoo Sir',
    passwordPlainText: 'A not so very Bad password for Yoo',
    last25: ['/hello0', '/world0']
  },
  {
    uacct: nanoid(12),
    email: 'tokens.TimEst@example.com',
    displayName: 'T Est',
    passwordPlainText: 'A not so very Bad password for Tim',
    last25: ['/hello1', '/world1']
  },
  {
    uacct: nanoid(12),
    email: 'tokens.mdma@example.com',
    displayName: 'Molly',
    passwordPlainText: 'A not so very Bad password for Molly',
    last25: ['/hello2', '/world2']
  }
]

beforeAll(async () => {
  await user.batch.put(...userList)
})

afterAll(async () => {
  await user.batch.rm(...userList)

  // remove table data
  // so as to not interfere with other test-suites
  // await appTable.batchWrite(
  //   userList.map(u => user.ent.deleteBatch(u))
  // )
  // await appTable.batchWrite(
  //   userList.map(u => userLookup.ent.deleteBatch({ exID: u.email, typeID: 'email' }))
  // )
})

describe('POST /tokens', () => {
  // beforeEach(async () => {})
  // afterEach(async () => {})

  const postEvent = event('POST', '/tokens')

  test('Creds + TOTP = Regular Use Case', async () => {
    const { uacct, email, passwordPlainText } = userList[0]
    const usr = await user.getByID(uacct)

    const completeTokenResp = await handler({
      ...event('POST', '/tokens'),
      headers: {
        email: encodeURIComponent(email),
        p: atob(passwordPlainText),
        TFAtype: 'TOTP',
        TFAchallengeResp: authenticator.generate(
          usr.oobTokens.filter(t => t.strategy === 'TOTP')[0].secret.toString()
        )
      }
    }, ctx) as SRet

    const tokenBody = (JSON.parse(completeTokenResp.body ?? '{}') as {} | {authToken:string, user:{uacct:string, email:string} })

    expect(completeTokenResp.statusCode).toBe(200)
    expect(completeTokenResp.isBase64Encoded).toBe(false)
    expect(tokenBody).toHaveProperty('authToken')
    expect(tokenBody).toHaveProperty('user')
  })

  test('Creds + BackupCode = A Normal Use Case', async () => {
    const { uacct, email, passwordPlainText } = userList[0]
    const usr = await user.getByID(uacct)
    const numBackupCodes = usr.backupCodes.length

    const bCode = usr.backupCodes[0]

    const e = {
      ...event('POST', '/tokens'),
      headers: {
        email: encodeURIComponent(email),
        p: atob(passwordPlainText),
        TFAtype: 'Backup',
        TFAchallengeResp: bCode
      }
    }

    const completeTokenResp = await handler(e, ctx) as SRet
    const tokenBody = (JSON.parse(completeTokenResp.body ?? '{}') as {} | {authToken:string, user:{uacct:string, email:string} })

    expect(completeTokenResp.statusCode).toBe(200)
    expect(completeTokenResp.isBase64Encoded).toBe(false)
    expect(tokenBody).toHaveProperty('authToken')
    expect(tokenBody).toHaveProperty('user')

    const usrLessBackupCode = await user.getByID(uacct)
    const usedOneBackUpCode = usrLessBackupCode.backupCodes.length
    expect(usedOneBackUpCode).toBe(numBackupCodes - 1)
  })

  test('Make a complete token for YOOSir - the starter + OOB gives you a valid token', async () => {
    const { uacct, email, passwordPlainText } = userList[0]
    await sleep(1350)
    const usr = await user.getByID(uacct)
    // console.info({ userInTest: usr })

    const e = {
      ...postEvent,
      headers: {
        email: encodeURIComponent(email),
        p: atob(passwordPlainText),
        TFAtype: 'TOTP',
        TFAchallengeResp: authenticator.generate(
          usr.oobTokens.filter(t => t.strategy === 'TOTP')[0].secret.toString()
        )
      }
    }

    // console.dir({ e, ctx })
    const resp = await handler(e, ctx) as SRet
    // console.dir(resp)

    expect(resp.statusCode).toBe(200)
    expect(resp.isBase64Encoded).toBe(false)
    expect(resp).toHaveProperty('body')
    const body = (JSON.parse(resp.body ?? 'null') as any)
    // console.info(body)

    const { obj } = await accessToken().fromString(body?.authToken)
    const tokenObj = obj

    // console.dir({ tokenObj })
    expect(tokenObj).toHaveProperty('email', email)
    expect(tokenObj).toHaveProperty('uacct', uacct)
    expect(tokenObj).toHaveProperty('last25')

    // @todo @fix a terrible race condition that is plaguing the last25 getting added to the user
    // expect(tokenObj).toHaveProperty('last25', last25)

    expect(body).toHaveProperty('authToken')
    expect(body).toHaveProperty('user')
    expect(body.user).toHaveProperty('email', email)
    expect(body.user).toHaveProperty('uacct', uacct)
    expect(body.user.email).toEqual(tokenObj.email)
    expect(body.user.uacct).toEqual(tokenObj.uacct)
  })

  test('Send in Nothing ', async () => {
    const resp = await handler(postEvent, ctx) as SRet
    const body = (JSON.parse(resp.body ?? '{}') as {starterToken?:string})

    expect(resp.statusCode).toBe(400)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('errors')
  })

  test('Only Creds Matter - Token is ignored', async () => {
    const e = { ...postEvent }
    const { uacct, email, passwordPlainText } = userList[0]
    const usr = await user.getByID(uacct).catch(er => ({ oobTokens: [] }))

    e.headers = {
      authToken: (await accessToken().create({
        uacct,
        email: 'mismatchedEmail@example.com',
        last25: []
      })).token,
      email: encodeURIComponent(email),
      p: atob(passwordPlainText),
      TFAtype: 'TOTP',
      TFAchallengeResp: authenticator.generate(
        usr.oobTokens.filter(t => t.strategy === 'TOTP')[0].secret.toString()
      )
    }

    const resp = await handler(e, ctx) as SRet
    const body = (JSON.parse(resp.body ?? 'null') as any)

    expect(resp.statusCode).toBe(200)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('authToken')
    expect(body).toHaveProperty('user')
  })

  test('Bad Password Request', async () => {
    const { email } = userList[1]

    const e = { ...postEvent }
    e.headers = {
      email: encodeURIComponent(email),
      p: '_BAD_PASSWORD_'
    }

    const resp = await handler(e, ctx) as SRet
    const body = (JSON.parse(resp.body ?? 'null') as any)

    // console.log({ e })
    // console.log({ body })

    expect(resp.statusCode).toBe(400)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('errors')
  })

  test('AuthToken + Creds Request', async () => {
    const { uacct, email, passwordPlainText, last25 } = userList[1]
    await sleep(250)

    const usr = await user.getByID(uacct)
    // console.info({ usr })

    const { token } = await accessToken().create(({ uacct, email, last25 }))
    const e = { ...postEvent }

    e.headers = {
      authToken: token,
      email: encodeURIComponent(email),
      p: atob(passwordPlainText),
      TFAtype: 'TOTP',
      TFAchallengeResp: authenticator.generate(
        usr.oobTokens.filter(t => t.strategy === 'TOTP')[0].secret.toString()
      )
    }

    const resp = await handler(e, ctx) as SRet
    const body = (JSON.parse(resp.body ?? 'null') as any)

    expect(body).toHaveProperty('authToken')
    expect(resp.statusCode).toBe(200)
    expect(resp.isBase64Encoded).toBe(false)
    await expect(accessToken().isVerified(body.authToken)).resolves.toBe(true)

    const { obj } = await accessToken().fromString(body.authToken)
    const respAuthToken = obj
    expect(respAuthToken).toHaveProperty('email', email)
    expect(respAuthToken).toHaveProperty('uacct', uacct)
    expect(respAuthToken).toHaveProperty('last25', last25)
  })

  test('Missing Email Request', async () => {
    const { uacct, email, passwordPlainText } = userList[2]
    const usr = await user.getByID(uacct)
    const last25 = ['/hello', '/world']

    const e = { ...postEvent }
    e.headers = {
      authToken: (await accessToken().create({ uacct, email, last25 })).token,
      p: atob(passwordPlainText),
      TFAtype: 'TOTP',
      TFAchallengeResp: authenticator.generate(
        usr.oobTokens.filter(t => t.strategy === 'TOTP')[0].secret.toString()
      )
    }

    const resp = await handler(e, ctx) as SRet
    const body = (JSON.parse(resp.body ?? 'null') as any)

    // console.log({ e })
    // console.log({ body })

    expect(resp.statusCode).toBe(400)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('errors')
  })

  test('Invalid Email Request', async () => {
    const e = { ...postEvent }
    e.headers = {
      email: encodeURIComponent('anEmailThatDoesNotExist@example.com'),
      p: atob('plaintextPassword')
    }

    const resp = await handler(e, ctx) as SRet
    const body = (JSON.parse(resp.body ?? 'null') as any)

    expect(resp.statusCode).toBe(400)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('errors')
  })

  // test.todo('YooSir delegates Molly to His Account')
  // test.todo('Molly retrives an authToken for usage on Yoo`s behalf')
  // test.todo('Molly performs actions on Yoos behalf')
})

describe('GET /tokens', () => {
  const GETevent = event('GET', '/tokens')

  // beforeEach(async () => {})
  // afterEach(async () => {})

  test('Get tokens available for Yoo', async () => {
    const { uacct, email } = userList[0]
    // const usr = await user.getByID(uacct)
    const initialJWT = await accessToken().create({ uacct, email, last25: [] })
    const e = { ...GETevent, headers: { authToken: initialJWT.token } }

    // console.log({ token, e })
    const resp = await handler(e, ctx) as SRet
    const body = (JSON.parse(resp?.body ?? 'null') as any)

    // console.dir({ resp, body })

    await expect(accessToken().isVerified(body.refreshedAuthToken)).resolves.toBeTruthy()
    const refreshedJWT = await accessToken().fromString(body.refreshedAuthToken)

    // console.log({ initialJWT, refreshedJWT })

    expect(resp.statusCode).toBe(200)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('refreshedAuthToken')
    expect(body).toHaveProperty('user')
    expect(body).toHaveProperty('delegateStarterTokens')
    expect(body).toHaveProperty('revocableDelegationStarterTokens')
    expect(refreshedJWT.headers.iat).toBeGreaterThanOrEqual(initialJWT.headers.iat ?? Infinity)
    expect(refreshedJWT.headers.exp).toBeGreaterThanOrEqual(initialJWT.headers.exp ?? Infinity)
  })

  test('Get tokens for Yoo w/ an Invalid Token', async () => {
    const { uacct, email } = userList[0]
    // const usr = await user.getByID(uacct)
    const initialJWT = await accessToken('bad secret').create({ uacct, email, last25: [] })
    const e = { ...GETevent, headers: { authToken: initialJWT.token } }

    // console.log({ token, e })
    const resp = await handler(e, ctx) as SRet
    const body = (JSON.parse(resp?.body ?? 'null') as any)

    expect(resp.statusCode).toBe(400)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('errors')
  })

  test('Get tokens for Yoo but forgets to give a Token', async () => {
    // const { uacct, email } = userList[0]
    // const usr = await user.getByID(uacct)

    // console.log({ token, e })
    const resp = await handler(GETevent, ctx) as SRet
    const body = (JSON.parse(resp?.body ?? 'null') as any)

    expect(resp.statusCode).toBe(400)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('errors')
  })

  /**
   * @todo decide if we can remove this since we are moving to a biz object pattern that encapsulates the input and output types
   */
  test.skip('Invalid Request for Yoo', async () => {
    const { uacct, email } = userList[0]
    // const usr = await user.getByID(uacct)
    const initalAuthToken = (await accessToken('_Not The Righyt Key_').create({ email, uacct, last25: [] })).token

    const e = { ...GETevent }
    e.headers = { authToken: initalAuthToken }

    // console.log({ e })
    const resp = await handler(e, ctx) as SRet
    const body = (JSON.parse(resp.body ?? 'null') as any)

    expect(resp.statusCode).toBe(400)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('errors')
  })
})

describe('PUT /tokens', () => {
  // eslint-disable-next-line no-unused-vars
  const tokEvt = event('PUT', '/tokens')

  test.skip('Refresh token for Yoo', async () => {

  })
})

describe('DELETE /tokens', () => {
  // eslint-disable-next-line no-unused-vars
  const tokEvt = event('DELETE', '/tokens')
  // beforeEach(async () => {})
  // afterEach(async () => {})

  // test('Revoke a delegation token for Yoo', async () => {})
})

describe.skip('delegation via  tokens', () => {
  // eslint-disable-next-line no-unused-vars
  const tokEvt = event('DELETE', '/tokens')
  test.skip('Revoke a delegation token for Yoo', async () => {
    console.log(tokEvt)
  })
})
