/* globals describe test expect beforeEach afterEach beforeAll afterAll */

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

const userList = [
  {
    uacct: nanoid(12),
    email: 'tokens.user1@example.com',
    displayName: 'Yoo Sir',
    passwordPlainText: 'A not so very Bad password for Yoo'
  },
  {
    uacct: nanoid(12),
    email: 'tokens.TimEst@example.com',
    displayName: 'T Est',
    passwordPlainText: 'A not so very Bad password for Tim'
  },
  {
    uacct: nanoid(12),
    email: 'tokens.mdma@example.com',
    displayName: 'Molly',
    passwordPlainText: 'A not so very Bad password for Molly'
  }
]

beforeAll(async () => {
  await user.batch.put(...userList)

  // // load table data
  // await appTable.batchWrite(
  //   await Promise.all(
  //     userList.map(async u => {
  //       const { email, plaintextPassword, ...usr } = u
  //       return user.ent.putBatch({
  //         ...usr,
  //         email: u.email,
  //         pwHash: await user.password.toHash(plaintextPassword),
  //         backupCodes: await user.otp.genBackups(),
  //         oobTokens: [await user.otp.gen2FA(u.uacct, 'TOTP', 'initial TOTP')]
  //       })
  //     })
  //   ))// end user batch
  //
  // await Promise.all([
  //   ...userList.map(
  //     async u => user.addExternalID(u.uacct, 'email', u.email)
  //   )
  // ])
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

  /**
   * @todo remove this test - as this use case is no longer supported
   */
  test.skip('Make a starter token for YOOSir - the starter + OOB gives you a valid token', async () => {
    const user = userList[0]
    const e = { ...postEvent }
    e.headers = {
      email: encodeURIComponent(user.email),
      p: atob(user.passwordPlainText)
    }
    const resp = await handler(e, ctx) as SRet
    const body = (JSON.parse(resp.body ?? 'null') as any)

    expect(resp.statusCode).toBe(200)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('starterToken')

    const respObjToken = (await accessToken().fromString(body.starterToken)).obj
    const exampleTokObj = (await accessToken().create({ email: user.email, uacct: user.uacct, last25: [] })).obj

    expect(respObjToken).toEqual(exampleTokObj)
  })

  /**
   * @todo remove as this is no longer a supported use case
   */
  test.skip('Send token + Credentials', async () => {
    const user = userList[0]
    const e = { ...postEvent }
    e.headers = {
      authToken: (await accessToken().create({
        email: user.email,
        last25: [],
        uacct: user.uacct
      })).token,
      uacct: user.uacct,
      email: encodeURIComponent(user.email),
      p: atob(user.passwordPlainText)
    }
    const resp = await handler(e, ctx) as SRet
    const body = (JSON.parse(resp.body ?? 'null') as any)

    expect(resp.statusCode).toBe(200)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toEqual({
      starterToken: (await accessToken().create({ email: user.email, uacct: user.uacct, last25: [] })).token
    })
  })

  test('Make a complete token for YOOSir - the starter + OOB gives you a valid token', async () => {
    const { uacct, email, passwordPlainText } = userList[0]
    const usr = await user.getByID(uacct)

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

    // console.dir({e, ctx})
    const resp = await handler(e, ctx) as SRet
    // console.dir(resp)

    const body = (JSON.parse(resp.body ?? 'null') as any)
    // console.dir(body)

    const { obj } = await accessToken().fromString(body?.authToken)
    // console.dir(obj)

    expect(resp.statusCode).toBe(200)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('authToken')
    expect(body).toHaveProperty('user')
    expect(obj).toEqual({ email: usr.email, uacct: usr.uacct, last25: usr?.last25 ?? [] })
  })

  test('Send in Nothing ', async () => {
    const resp = await handler(postEvent, ctx) as SRet
    const body = (JSON.parse(resp.body ?? '{}') as {starterToken?:string})

    expect(resp.statusCode).toBe(400)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('errors')
  })

  test('First grab a StarterToken', async () => {
    const { uacct, email, passwordPlainText } = userList[0]
    const usr = await user.getByID(uacct)

    const e = {
      ...postEvent,
      headers: {
        email: encodeURIComponent(email),
        p: atob(passwordPlainText)
      }
    }

    const startTokenResp = await handler(e, ctx) as SRet
    const starterTokenBody = (JSON.parse(startTokenResp.body ?? '{}') as {starterToken?:string})

    const { starterToken } = starterTokenBody

    const completeTokenResp = await handler({
      ...event('POST', '/tokens'),
      headers: {
        authToken: starterToken,
        email: encodeURIComponent(email),
        p: atob(passwordPlainText),
        TFAtype: 'TOTP',
        TFAchallengeResp: authenticator.generate(
          usr.oobTokens.filter(t => t.strategy === 'TOTP')[0].secret.toString()
        )
      }
    }, ctx) as SRet
    const completeTokenBody = (JSON.parse(completeTokenResp.body ?? '{}') as {} | {authToken:string, user:{uacct:string, email:string} })

    // console.log({completeTokenBody})

    expect(completeTokenResp.statusCode).toBe(200)
    expect(completeTokenResp.isBase64Encoded).toBe(false)
    expect(completeTokenBody).toHaveProperty('authToken')
    expect(completeTokenBody).toHaveProperty('user')
  })

  /**
   * Maybe this test passes now since we dont care about tokens
   */
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

  /**
   * @todo #premature optimization
   */
  test.skip('Valid but old Token that`s missing a uacct', async () => {
    const { uacct, email, passwordPlainText } = userList[0]
    const usr = await user.getByID(uacct)

    const e = { ...postEvent }
    e.headers = {
      authToken: (await accessToken().create({ email, uacct, last25: [] })).token,
      email: encodeURIComponent(email),
      p: atob(passwordPlainText),
      TFAtype: 'TOTP',
      TFAchallengeResp: authenticator.generate(
        usr.oobTokens.filter(t => t.strategy === 'TOTP')[0].secret.toString()
      )
    }

    // console.log({ e })
    const resp = await handler(e, ctx) as SRet
    const body = (JSON.parse(resp.body ?? 'null') as any)
    // console.log({ body })

    const respAuthToken = (await accessToken().fromString(body.authToken)).obj
    const exampleToken = (await accessToken().create({ email, uacct, last25: [] })).obj

    expect(resp.statusCode).toBe(200)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('authToken')
    expect(respAuthToken).toEqual(exampleToken)
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
    const { uacct, email, passwordPlainText } = userList[0]
    const usr = await user.getByID(uacct)
    const last25 = ['/hello', '/world']

    const initalAuthToken = (await accessToken().create(({ uacct, email, last25 }))).token

    const e = { ...postEvent }
    e.headers = {
      authToken: initalAuthToken,
      email: encodeURIComponent(email),
      p: atob(passwordPlainText),
      TFAtype: 'TOTP',
      TFAchallengeResp: authenticator.generate(
        usr.oobTokens.filter(t => t.strategy === 'TOTP')[0].secret.toString()
      )
    }

    const resp = await handler(e, ctx) as SRet
    const body = (JSON.parse(resp.body ?? 'null') as any)

    const respAuthToken = (await accessToken().fromString(body.authToken)).obj
    await expect(accessToken().isVerified(body.authToken)).resolves.toBe(true)

    expect(resp.statusCode).toBe(200)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('authToken')

    expect(respAuthToken).toHaveProperty('email')
    expect(respAuthToken).toHaveProperty('uacct')
    expect(respAuthToken).toHaveProperty('last25')
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

  beforeEach(async () => {})
  afterEach(async () => {})
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
