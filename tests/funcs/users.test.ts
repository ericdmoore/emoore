/* globals describe test expect  beforeAll afterAll */
// beforeEach afterEach
import type { Evt, SRet } from '../../server/types'
import type { UseBase } from '../../server/entities/users'

import handler from '../../server/funcs/users'
import { user } from '../../server/entities'

import { event, ctx } from '../gatewayData'
import { nanoid } from 'nanoid'
import { accessToken, acceptanceToken } from '../../server/auths/tokens'
import { brotliDecompress } from 'zlib'
import { promisify } from 'util'
import { atob } from '../../server/utils/base64'
import { JSONparse } from '../../server/utils/jsonParse'

const openBrotliP = promisify(brotliDecompress)

// interface IUserInfo extends JWTelementsOptionInputs{
//   email:string
//   displayName:string
//   plaintextPassword: string
//   uacct?: string
// }

// type IUerInfoOutputs = IUserInfo & JWTelementsExtras

export const userList = [
  {
    email: 'users.user1@example.com',
    uacct: nanoid(12),
    displayName: 'Yoo Sir',
    passwordPlainText: 'A not so very Bad password for Yoo'
  },
  {
    email: 'users.TimEst@example.com',
    uacct: nanoid(12),
    displayName: 'T Est',
    passwordPlainText: 'A not so very Bad password for Tim'
  },
  {
    email: 'users.mdma@example.com',
    uacct: nanoid(12),
    displayName: 'Molly',
    passwordPlainText: 'A not so very Bad password for Molly'
  }
] as UseBase[]

// const signAcceptanceToken = jwtSign<IUserInfo>()
// const signAuthToken = jwtSign<JWTObjectInput>()
// const verifyToken = jwtVerify<IUerInfoOutputs>()

beforeAll(async () => {
  await user.batch.put(...userList)
})

afterAll(async () => {
  await user.batch.rm(...userList)
})

/*
Overview
=============
* POST :: user -> (+2FA?) -> token
* POST :: user + delegation User -> delegation starterToken // not supported anymore
* GET :: token -> tokens
* PUT :: token -> token
* DELE :: token -> confimationMessage
*/

const fmtUserInfo = (i:{email:string, displayName:string, passwordPlainText: string, uacct?:string}) => ({
  email: encodeURIComponent(i.email),
  displayName: encodeURIComponent(i.displayName),
  passwordPlainText: atob(i.passwordPlainText),
  uacct: i.uacct
})

describe('POST /users', () => {
  // beforeEach(async () => {})
  // afterEach(async () => {})

  const postEvent = event('POST', '/users')

  test('New User :: userInfo + acceptanceToken', async () => {
    const userInfo = {
      email: 'examplerA@example.com',
      displayName: 'Exampler Man',
      passwordPlainText: 'A Very Plain Ol Password'
    }
    const accToken = (await acceptanceToken().create(userInfo)).token
    const e = {
      ...postEvent,
      queryStringParameters: {
        ...fmtUserInfo(userInfo),
        acceptanceToken: accToken
      }
    }

    // console.log({ e })
    const resp = await handler(e, ctx) as SRet
    // console.log({ resp })

    const { err, data } = JSONparse(resp?.body ?? 'null')
    const body = data
    expect(err).toBeFalsy()
    expect(body).toHaveProperty('user')
    expect(resp.statusCode).toBe(200)
    expect(resp.isBase64Encoded).toBe(false)
  })

  test('New User with {accept-encoding:br} :: userInfo + acceptanceToken ', async () => {
    const userInfo = {
      uacct: atob(nanoid(15)),
      email: 'veryLongEmailExamplerSoThatTheCompressionWillKicIn@example.com',
      displayName: `Exampler Lady WithATerriblyLongLastName with an 
      AwesomePassword that keeps going for days so that the compression algo will kick in,
      AwesomePassword that keeps going for days so that the compression algo will kick in,
      AwesomePassword that keeps going for days so that the compression algo will kick in,
      AwesomePassword that keeps going for days so that the compression algo will kick in,
      AwesomePassword that keeps going for days so that the compression algo will kick in,
      AwesomePassword that keeps going for days so that the compression algo will kick in,
      AwesomePassword that keeps going for days so that the compression algo will kick in,
      AwesomePassword that keeps going for days so that the compression algo will kick in,
      AwesomePassword that keeps going for days so that the compression algo will kick in,
      AwesomePassword that keeps going for days so that the compression algo will kick in,
      AwesomePassword that keeps going for days so that the compression algo will kick in`,
      passwordPlainText: ' This element is not included in the response so it does not make sense to make it terribly long'
    }

    const e = {
      ...postEvent,
      headers: { 'Accept-Encoding': 'br' },
      queryStringParameters: {
        acceptanceToken: (await acceptanceToken().create(userInfo)).token,
        ...fmtUserInfo(userInfo)
      }
    }

    // console.log({ e })
    const resp = await handler(e, ctx) as SRet
    // console.log({ resp })

    const uncBody = await openBrotliP(
      Buffer.from(resp.body as string, 'base64')
    ).catch(() => Buffer.from('{}'))

    const uncBodyStr = uncBody.toString('utf-8')
    const { err, data } = JSONparse(uncBodyStr)
    const body = data

    // console.log({ body })

    expect(err).toBeFalsy()
    expect(resp.statusCode).toBe(200)
    expect(resp.isBase64Encoded).toBe(true)
    expect(body).toHaveProperty('user')

    // expect(Buffer.isBuffer(resp.body)).toBe(true)
  })

  test('Error: Existing User :: userInfo + acceptanceToken', async () => {
    const usr = userList[0]
    const userInfo = {
      email: usr.email,
      displayName: usr.displayName,
      passwordPlainText: usr.passwordPlainText
    }

    const accToken = (await acceptanceToken().create(userInfo)).token

    const e = {
      ...postEvent,
      queryStringParameters: {
        ...userInfo,
        acceptanceToken: accToken,
        email: encodeURIComponent(userInfo.email),
        passwordPlainText: atob(userInfo.passwordPlainText)
      }
    }

    const resp = await handler(e, ctx) as SRet
    const { err, data } = JSONparse(resp?.body ?? 'null')
    const body = data

    expect(err).toBeFalsy()
    expect(resp.statusCode).toBe(400)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('errors')
  })

  test('Error: Existing User with {accept-encoding:br} :: userInfo + acceptanceToken ', async () => {
    const usr = userList[0]
    const userInfo = {
      email: usr.email,
      displayName: usr.displayName,
      passwordPlainText: usr.passwordPlainText
    }

    const accToken = (await acceptanceToken().create(userInfo)).token

    const e = {
      ...postEvent,
      headers: { 'Accept-Encoding': 'br' },
      queryStringParameters: {
        ...userInfo,
        acceptanceToken: accToken,
        email: encodeURIComponent(userInfo.email),
        passwordPlainText: atob(userInfo.passwordPlainText)
      }
    }

    // console.log({ e })
    const resp = await handler(e, ctx) as SRet
    // console.log({ resp })
    const { err, data } = JSONparse(resp?.body ?? 'null')
    const body = data

    // errors are not compressed for now
    // additionally, the response would not likely trigger the compression requirement
    expect(err).toBeFalsy()
    expect(resp.statusCode).toBe(400)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('errors')

    // expect(Buffer.isBuffer(resp.body)).toBe(true)
  })

  test('Errors: userInfo, acceptanceToken mismatch', async () => {
    const usr = userList[0]
    const userInfo = {
      email: usr.email,
      displayName: usr.displayName,
      passwordPlainText: usr.passwordPlainText,
      auto: true
    }
    // const acceptanceToken = await signAcceptanceToken()

    const accToken = (await acceptanceToken().create({ ...userInfo, uacct: '1234567890' })).token

    const e = {
      ...postEvent,
      queryStringParameters: {
        acceptanceToken: accToken,
        displayName: usr.displayName,
        email: encodeURIComponent(userInfo.email),
        passwordPlainText: atob(userInfo.passwordPlainText)
      }
    } as Evt

    const resp = await handler(e, ctx) as SRet
    const body = JSON.parse(resp.body ?? '{}') as any

    expect(resp.statusCode).toBe(400)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('errors')
  })

  test('Send in Nothing ', async () => {
    const resp = await handler(postEvent, ctx) as SRet
    const { err, data } = JSONparse(resp?.body ?? 'null')
    const body = data

    expect(err).toBeFalsy()
    expect(resp.statusCode).toBe(400)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('errors')
  })
})

describe('GET /users', () => {
  const GETevent = event('GET', '/users')

  test('Valid Request for Yoo Sir', async () => {
    const e = { ...GETevent }
    const { uacct, email } = userList[0]

    const authToken = (await accessToken().create({ uacct: uacct as string, email, last25: [] })).token
    e.headers = { authToken }

    // const uTest = await user.getByID(uacct).catch(er => undefined)
    // console.log({ e, uTest })

    const resp = await handler(e, ctx) as SRet
    const { err, data } = JSONparse(resp?.body ?? 'null')
    const body = data
    // console.log({ resp })
    expect(err).toBeFalsy()
    expect(resp.statusCode).toBe(200)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('user')
  })

  test('Invalid Request for Yoo Sir', async () => {
    const e = { ...GETevent }
    const { uacct, email } = userList[0]
    // const usr = await user.getByID(uacct)
    const authToken = (await accessToken('_Not The Righyt Key_').create({ uacct: uacct as string, email, last25: [] })).token
    e.headers = { authToken }

    const resp = await handler(e, ctx) as SRet
    // console.log({ resp })

    const { err, data } = JSONparse(resp?.body ?? 'null')
    const body = data
    expect(err).toBeFalsy()
    expect(resp.statusCode).toBe(400)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('errors')
  })
})

describe('PUT /users', () => {
  // eslint-disable-next-line no-unused-vars
  const putEvent = event('PUT', '/users')
  test('Change Password', async () => {
    const e = { ...putEvent }
    const { uacct, email } = userList[0]
    const authToken = (await accessToken().create({ uacct: uacct as string, email, last25: [] })).token
    const newPlaintextPassword = 'an updatedPassword'

    e.headers = {
      authToken,
      newPlaintextPassword: atob(newPlaintextPassword)
    }

    const resp = await handler(e, ctx) as SRet
    const body = (JSON.parse(resp.body ?? 'null') as any)

    const uVerify = await user.getByID(uacct as string)
    // console.log({ resp })

    expect(resp.statusCode).toBe(200)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('user')
    expect(body.user.uacct).toEqual(uVerify.uacct)
    expect(
      user.password.isValidForUser({ uacct: uacct as string, passwordPlainText: newPlaintextPassword })
    ).toBeTruthy()
  })

  test('Simul update of Email and DisplayName for Yoo', async () => {
    const e = { ...putEvent }
    const { uacct, email } = userList[0]
    const newEmail = 'someOTherEmail@exmaple2.com'
    const newDisplayName = 'I\'m the New DisplayName'

    e.headers = {
      authToken: (await accessToken().create({ uacct: uacct as string, email, last25: [] })).token,
      newEmail: encodeURIComponent(newEmail),
      newDisplayName: encodeURIComponent(newDisplayName)
    }

    const resp = await handler(e, ctx) as SRet
    const { err, data } = JSONparse(resp?.body ?? 'null')
    const body = data as any

    expect(err).toBeFalsy()
    expect(resp.statusCode).toBe(200)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('user')
    expect(body.user.email).toEqual(newEmail)
    expect(body.user.displayName).toEqual(newDisplayName)
  })

  test('Refresh Backup Codes for Yoo', async () => {
    const e = { ...putEvent }
    const { uacct, email } = userList[0]
    const authToken = (await accessToken().create({ uacct: uacct as string, email, last25: [] })).token

    const uBefore = await user.getByID(uacct as string)
    e.headers = { authToken, refreshBackupCodes: 'true' }
    const resp = await handler(e, ctx) as SRet
    const { err, data } = JSONparse(resp?.body ?? 'null')
    const body = data as any
    const uAfter = await user.getByID(uacct as string)

    expect(err).toBeFalsy()
    expect(resp.statusCode).toBe(200)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('user')
    expect(uBefore.backupCodes).not.toEqual(uAfter.backupCodes)
  })

  test('Add TOTP Option for Yoo', async () => {
    const e = { ...putEvent }
    const { uacct, email } = userList[0]

    const authToken = (await accessToken().create({ uacct: uacct as string, email, last25: [] })).token
    e.headers = { authToken, addTOTP: 'Add_Me_KEEP_ME_label' }

    const uBefore = await user.getByID(uacct as string)
    const resp = await handler(e, ctx) as SRet
    const { err, data } = JSONparse(resp?.body ?? 'null')
    const body = data as any
    const uAfter = await user.getByID(uacct as string)

    expect(err).toBeFalsy()
    expect(resp.statusCode).toBe(200)
    expect(resp.isBase64Encoded).toBe(false)
    //
    expect(body).toHaveProperty('user')
    expect(body.TOTPdetails).toHaveProperty('strategy')
    expect(body.TOTPdetails).toHaveProperty('uri')
    expect(body.TOTPdetails).toHaveProperty('label')
    expect(uBefore.oobTokens.length).toBeLessThanOrEqual(uAfter.oobTokens.length)
  })
})

describe('Removing user attributes /users', () => {
  test('Add then Remove a TOTP oobToken for Yoo', async () => {
    const e = { ...event('PUT', '/users') }
    const { uacct, email } = userList[0]
    const authToken = (await accessToken().create({ uacct: uacct as string, email, last25: [] })).token

    const uBefore = await user.getByID(uacct as string)
    const label = 'Push/Pop_label'
    e.headers = { authToken, addTOTP: label }
    await handler(e, ctx) as SRet
    const uMiddle = await user.getByID(uacct as string)

    e.headers = { authToken, rmTOTP: label }
    const respRm = await handler(e, ctx) as SRet
    const uAfter = await user.getByID(uacct as string)

    const { err, data } = JSONparse(respRm.body ?? 'null')
    const body = data as any

    expect(respRm.statusCode).toBe(200)
    expect(respRm.isBase64Encoded).toBe(false)
    //
    expect(err).toBeFalsy()
    expect(body).toHaveProperty('user')
    expect(body).toHaveProperty('TOTPdetails')
    expect(body.TOTPdetails).toHaveProperty('wasRemoved', true)
    expect(body.TOTPdetails).toHaveProperty('tokensRemaining')
    expect(uMiddle.oobTokens.length).toBeGreaterThan(uBefore.oobTokens.length)
    expect(uMiddle.oobTokens.length).toBeGreaterThan(uAfter.oobTokens.length)
    expect(uBefore.oobTokens.length).toBe(uAfter.oobTokens.length)
  })
  // test.todo('Revoke a delegation token for Yoo')
  test.todo('Revoke a backup code when used')
})
