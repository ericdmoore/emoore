/* globals describe test expect beforeEach afterEach beforeAll afterAll */
import type { SRet } from '../../src/types'
import handler from '../../src/funcs/tokens'
import { user, appTable } from '../../src/entities'
import { event, ctx } from '../gatewayData'
import { nanoid } from 'nanoid'
import { userLookup } from '../../src/entities/userLookup'
import { atob } from '../../src/utils/base64'
import { jwtSign, jwtVerify } from '../../src/auths/validJWT'
import { authenticator } from 'otplib'

const userList = [
  {
    email: 'tokens.user1@example.com',
    uacct: nanoid(12),
    displayName: 'Yoo Sir',
    plaintextPassword: 'A not so very Bad password for Yoo'
  },
  {
    email: 'tokens.TimEst@example.com',
    uacct: nanoid(12),
    displayName: 'T Est',
    plaintextPassword: 'A not so very Bad password for Tim'
  },
  {
    email: 'tokens.mdma@example.com',
    uacct: nanoid(12),
    displayName: 'Molly',
    plaintextPassword: 'A not so very Bad password for Molly'
  }
]

// problem
// sig assumes server-side can impute the plaintext password
// it can not
// so instead of sending an hmac sig
// consider sending a p: base64(plainTextPassword)
//

const signToken = jwtSign()
const verifyToken = jwtVerify()

beforeAll(async () => {
  // load table data
  await appTable.batchWrite(
    await Promise.all(
      userList.map(async u => {
        const { email, plaintextPassword, ...usr } = u
        return user.ent.putBatch({
          ...usr,
          email: u.email,
          pwHash: await user.password.toHash(plaintextPassword),
          backupCodes: await user.otp.genBackups(),
          oobTokens: [await user.otp.gen2FA(u.uacct, 'TOTP', 'initial TOTP')]
        })
      })
    ))// end user batch

  await Promise.all([
    ...userList.map(
      async u => user.addExternalID(u.uacct, 'email', u.email)
    )
  ])
})

afterAll(async () => {
  // remove table data
  // so as to not interfere with other test-suites
  await appTable.batchWrite(
    userList.map(u => user.ent.deleteBatch(u))
  )
  await appTable.batchWrite(
    userList.map(u => userLookup.ent.deleteBatch({ exID: u.email, typeID: 'email' }))
  )
})

/*
Overview
=============
* POST :: user -> starterToken -> (+2FA?)-> token
* POST :: user + delegation User -> delegation starterToken
* GET :: token -> tokens
* PUT :: token -> token
* DELE :: token -> confimationMessage
*/

describe('POST /tokens', () => {
  // beforeEach(async () => {})
  // afterEach(async () => {})

  const postEvent = event('POST', '/tokens')

  test('Make a starter token for YOOSir - the starter + OOB gives you a valid token', async () => {
    const user = userList[0]
    const e = { ...postEvent }
    e.headers = {
      email: encodeURIComponent(user.email),
      p: atob(user.plaintextPassword)
    }
    const resp = await handler(e, ctx) as SRet
    const body = (JSON.parse(resp.body ?? 'null') as any)

    expect(resp.statusCode).toBe(200)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toEqual({
      starterToken: await signToken({ email: user.email, uacct: user.uacct, maxl25: [] })
    })
  })

  test('Make a complete token for YOOSir - the starter + OOB gives you a valid token', async () => {
    const { uacct, email, plaintextPassword } = userList[0]
    const usr = await user.getByID(uacct)

    const e = { ...postEvent }
    e.headers = {
      email: encodeURIComponent(email),
      p: atob(plaintextPassword),
      TFAtype: 'TOTP',
      TFAchallengeResp: authenticator.generate(
        usr.oobTokens.filter(t => t.strategy === 'TOTP')[0].secret.toString()
      )
    }

    const resp = await handler(e, ctx) as SRet
    const body = (JSON.parse(resp.body ?? 'null') as any)

    // console.log({ e })
    // console.log({ body })

    expect(resp.statusCode).toBe(200)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty(['authToken'])
    expect(body?.authToken).toEqual(await signToken({ email, uacct, maxl25: [] }))
  })

  test('Send in Nothing ', async () => {
    const resp = await handler(postEvent, ctx) as SRet
    const body = (JSON.parse(resp.body ?? '{}') as {starterToken?:string})

    expect(resp.statusCode).toBe(400)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('errors')
  })

  test('First grab a StarterToken', async () => {
    const { uacct, email, plaintextPassword } = userList[0]
    const usr = await user.getByID(uacct)

    const e = {
      ...postEvent,
      headers: {
        email: encodeURIComponent(email),
        p: atob(plaintextPassword)
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
        p: atob(plaintextPassword),
        TFAtype: 'TOTP',
        TFAchallengeResp: authenticator.generate(
          usr.oobTokens.filter(t => t.strategy === 'TOTP')[0].secret.toString()
        )
      }
    }, ctx) as SRet
    const completeTokenBody = (JSON.parse(completeTokenResp.body ?? '{}') as {} | {authToken:string, user:{uacct:string, email:string} })

    expect(completeTokenResp.statusCode).toBe(200)
    expect(completeTokenResp.isBase64Encoded).toBe(false)
    expect(completeTokenBody).toHaveProperty('authToken')
    expect(completeTokenBody).toHaveProperty('user')
  })

  test('Token and Creds are out of step', async () => {
    const { uacct, email, plaintextPassword } = userList[0]
    const usr = await user.getByID(uacct).catch(er => ({ oobTokens: [] }))

    const e = { ...postEvent }
    e.headers = {
      authToken: await signToken({
        uacct,
        maxl25: [],
        email: 'mismatchedEmail@example.com'
      }),
      email: encodeURIComponent(email),
      p: atob(plaintextPassword),
      TFAtype: 'TOTP',
      TFAchallengeResp: authenticator.generate(
        usr.oobTokens.filter(t => t.strategy === 'TOTP')[0].secret.toString()
      )
    }

    const resp = await handler(e, ctx) as SRet
    const body = (JSON.parse(resp.body ?? 'null') as any)

    expect(resp.statusCode).toBe(400)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('errors')
  })

  test('Valid but old Token that`s missing a uacct', async () => {
    const { uacct, email, plaintextPassword } = userList[0]
    const usr = await user.getByID(uacct)

    const e = { ...postEvent }
    e.headers = {
      authToken: await signToken({ email, maxl25: [] }),
      email: encodeURIComponent(email),
      p: atob(plaintextPassword),
      TFAtype: 'TOTP',
      TFAchallengeResp: authenticator.generate(
        usr.oobTokens.filter(t => t.strategy === 'TOTP')[0].secret.toString()
      )
    }

    // console.log({ e })
    const resp = await handler(e, ctx) as SRet
    const body = (JSON.parse(resp.body ?? 'null') as any)
    // console.log({ body })

    expect(resp.statusCode).toBe(200)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('authToken')
    expect(body?.authToken).toEqual(await signToken({ email, uacct, maxl25: [] }))
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
    expect(body).toHaveProperty(['errors'])
    // expect(body?.authToken).toEqual(await jwtSign()({ email, uacct, maxl25: [] }))
  })

  test('AuthToken + Creds Request', async () => {
    const { uacct, email, plaintextPassword } = userList[0]
    const usr = await user.getByID(uacct)
    const maxl25 = ['/hello', '/world']

    const e = { ...postEvent }
    e.headers = {
      authToken: await signToken({ uacct, email, maxl25 }),
      email: encodeURIComponent(email),
      p: atob(plaintextPassword),
      TFAtype: 'TOTP',
      TFAchallengeResp: authenticator.generate(
        usr.oobTokens.filter(t => t.strategy === 'TOTP')[0].secret.toString()
      )
    }

    const resp = await handler(e, ctx) as SRet
    const body = (JSON.parse(resp.body ?? 'null') as any)

    // console.log({ e })
    // console.log({ body })

    expect(resp.statusCode).toBe(200)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty(['authToken'])
    expect(body?.authToken).toEqual(await jwtSign()({ email, uacct, maxl25 }))
  })

  test('Missing Email Request', async () => {
    const { uacct, email, plaintextPassword } = userList[2]
    const usr = await user.getByID(uacct)
    const maxl25 = ['/hello', '/world']

    const e = { ...postEvent }
    e.headers = {
      authToken: await signToken({ uacct, email, maxl25 }),
      p: atob(plaintextPassword),
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

  test.todo('YooSir delegates Molly to His Account')
  test.todo('Molly retrives an authToken for usage on Yoo`s behalf')
  test.todo('Molly performs actions on Yoos behalf')
})

describe('GET /tokens', () => {
  const GETevent = event('GET', '/tokens')

  // beforeEach(async () => {})
  // afterEach(async () => {})

  test('Get tokens available for Yoo', async () => {
    const { uacct, email } = userList[0]
    // const usr = await user.getByID(uacct)
    const initalAuthToken = await signToken({ uacct, email, maxl25: [] })

    const e = { ...GETevent }
    e.headers = { authToken: initalAuthToken }

    // console.log({ e })
    const resp = await handler(e, ctx) as SRet
    const body = (JSON.parse(resp.body ?? 'null') as any)

    const refreshedJWT = await verifyToken(body.refreshedAuthToken)
    const initialJWTobj = await verifyToken(initalAuthToken)

    expect(resp.statusCode).toBe(200)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('refreshedAuthToken')
    expect(body).toHaveProperty('user')
    expect(body).toHaveProperty('delegateStarterTokens')
    expect(body).toHaveProperty('revocableDelegationStarterTokens')
    expect(refreshedJWT.iat).toBeGreaterThanOrEqual(initialJWTobj.iat)
    expect(refreshedJWT.exp).toBeGreaterThanOrEqual(initialJWTobj.exp)
  })

  test('Invalid Request for Yoo', async () => {
    const { uacct, email } = userList[0]
    // const usr = await user.getByID(uacct)
    const initalAuthToken = await jwtSign('_Not The Righyt Key_')({ uacct, email, maxl25: [] })

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
  test('Refresh token for Yoo', async () => {})
})

describe('DELETE /tokens', () => {
  // eslint-disable-next-line no-unused-vars
  const tokEvt = event('DELETE', '/tokens')

  beforeEach(async () => {})
  afterEach(async () => {})
  test.skip('Revoke a delegation token for Yoo', async () => {

  })
})
