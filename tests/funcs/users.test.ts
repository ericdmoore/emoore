/* globals describe test expect beforeEach afterEach beforeAll afterAll */
import type { Evt, SRet, JWTObjectInput, JWTelementsExtras, JWTelementsOptionInputs} from '../../src/types'
import handler from '../../src/funcs/users'
import { user, appTable } from '../../src/entities'
import { event, ctx } from '../gatewayData'
import { nanoid } from 'nanoid'
import { userLookup } from '../../src/entities/userLookup'
import { jwtSign, jwtVerify } from '../../src/auths/validJWT'
import { brotliDecompress } from 'zlib'
import { promisify } from 'util'
import { btoa, atob } from '../../src/utils/base64'
// import { sign } from 'jsonwebtoken'

const openBrotliP = promisify(brotliDecompress)

interface IUserInfo extends JWTelementsOptionInputs{
  email:string
  displayName:string
  plaintextPassword: string 
  uacct?: string
}

type IUerInfoOutputs = IUserInfo &  JWTelementsExtras

export const userList = [
  {
    email: 'users.user1@example.com',
    uacct: nanoid(12),
    displayName: 'Yoo Sir',
    plaintextPassword: 'A not so very Bad password for Yoo'
  },
  {
    email: 'users.TimEst@example.com',
    uacct: nanoid(12),
    displayName: 'T Est',
    plaintextPassword: 'A not so very Bad password for Tim'
  },
  {
    email: 'users.mdma@example.com',
    uacct: nanoid(12),
    displayName: 'Molly',
    plaintextPassword: 'A not so very Bad password for Molly'
  }
]

const signAcceptanceToken = jwtSign<IUserInfo>()
const signAuthToken = jwtSign<JWTObjectInput>()
const verifyToken = jwtVerify<IUerInfoOutputs>()

beforeAll( async () => {
  await user.batch.put(...userList)
})

afterAll( async () => {
  await user.batch.rm(...userList)
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

describe('POST /users', () => {
  // beforeEach(async () => {})
  // afterEach(async () => {})

  const postEvent = event('POST', '/users')

  test('New User :: userInfo + acceptanceToken', async () => {
    
    const userInfo = {
      email: 'examplerA@example.com',
      displayName: 'Exampler Man',
      plaintextPassword: 'A Very Plain Ol Password'
    }
    const acceptanceToken = await signAcceptanceToken(userInfo)
    const e = {
      ...postEvent, 
      queryStringParameters :{
        ...userInfo, 
        acceptanceToken,
        email: encodeURIComponent(userInfo.email),
        plaintextPassword: atob(userInfo.plaintextPassword)
      }
    }

    // console.log({ e })
    const resp = await handler(e, ctx) as SRet
    // console.log({ resp })

    const body = (JSON.parse(resp.body ?? '{}')) as any
    expect(resp.statusCode).toBe(200)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('user')
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
      plaintextPassword: ` This element is not included in the response so it does not make sense to make it terribly long`
      
    }

    const acceptanceToken = await signAcceptanceToken(userInfo)    
    const e = {
      ...postEvent,
      headers: {'Accept-Encoding':'br'},
      queryStringParameters: {
        ...userInfo,
        acceptanceToken,
        email: encodeURIComponent(userInfo.email),
        plaintextPassword: atob(userInfo.plaintextPassword)
      }
    }
    
    // console.log({ e })
    const resp = await handler(e, ctx) as SRet
    // console.log({ resp })

    const uncBody = await openBrotliP(
      Buffer.from(resp.body as string,'base64')
    ).catch(()=>Buffer.from('{}'))

    const uncBodyStr = uncBody.toString('utf-8')
    const body = JSON.parse(uncBodyStr)

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
      plaintextPassword: usr.plaintextPassword
    }

    const acceptanceToken = await signAcceptanceToken(userInfo)
    const e = {
      ...postEvent, 
      queryStringParameters :{
        ...userInfo, 
        acceptanceToken,
        email: encodeURIComponent(userInfo.email),
        plaintextPassword: atob(userInfo.plaintextPassword)
      }
    }

    const resp = await handler(e, ctx) as SRet
    const body = (JSON.parse(resp.body ?? '{}')) as any
    
    expect(resp.statusCode).toBe(400)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('errors')
  })

  test('Error: Existing User with {accept-encoding:br} :: userInfo + acceptanceToken ', async () => {
    const usr = userList[0]
    const userInfo = {
      email: usr.email,
      displayName: usr.displayName,
      plaintextPassword: usr.plaintextPassword
    }

    const acceptanceToken = await signAcceptanceToken(userInfo)    
    const e = {
      ...postEvent,
      headers: {'Accept-Encoding':'br'},
      queryStringParameters: {
        ...userInfo,
        acceptanceToken,
        email: encodeURIComponent(userInfo.email),
        plaintextPassword: atob(userInfo.plaintextPassword)
      }
    }
    
    // console.log({ e })
    const resp = await handler(e, ctx) as SRet
    // console.log({ resp })
    const body = JSON.parse(resp.body??'{}')

    // errors are not compressed for now
    // additionally, the response would not likely trigger the compression requirement
    expect(resp.statusCode).toBe(400)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('errors')

    // expect(Buffer.isBuffer(resp.body)).toBe(true)

  })

  test('Errors: userInfo, acceptanceToken mismatch', async ()=>{
    const usr = userList[0]
    const userInfo = {
      email: usr.email,
      displayName: usr.displayName,
      plaintextPassword: usr.plaintextPassword,
      auto: true
    }
    const acceptanceToken = await signAcceptanceToken({ ...userInfo, uacct:'1234567890' })

    const e = {
      ...postEvent, 
      queryStringParameters: {
        acceptanceToken,
        displayName: usr.displayName,
        email: encodeURIComponent(userInfo.email),
        plaintextPassword: atob(userInfo.plaintextPassword),
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
    const body = (JSON.parse(resp.body ?? '{}') as {starterToken?:string})

    expect(resp.statusCode).toBe(400)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('errors')
  })
})

describe('GET /users', () => {
  const GETevent = event('GET', '/users')
  
  test('Valid Request for Yoo Sir', async () => {
    const e = {...GETevent}
    const { uacct, email } = userList[0]
    
    const authToken = await signAuthToken({ uacct, email, maxl25: [] })
    e.headers = { authToken }

    const uTest = await user.getByID(uacct).catch(er => undefined)
    // console.log({ e, uTest })
    
    const resp = await handler(e, ctx) as SRet
    const body = (JSON.parse(resp.body ?? 'null') as any)
    // console.log({ resp })
    
    expect(resp.statusCode).toBe(200)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('user')
  })

  test('Invalid Request for Yoo Sir', async () => {
    const e = {...GETevent}
    const { uacct, email } = userList[0]
    // const usr = await user.getByID(uacct)
    const authToken = await jwtSign('_Not The Righyt Key_')({ uacct, email, maxl25: [] })
    e.headers = { authToken }

    const resp = await handler(e, ctx) as SRet
    // console.log({ resp })

    const body = (JSON.parse(resp.body ?? 'null') as any)
    expect(resp.statusCode).toBe(400)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('errors')
  })
})

describe('PUT /users', () => {
  // eslint-disable-next-line no-unused-vars
  const putEvent = event('PUT', '/users')
  test('Change Password', async () => {
    const e = {...putEvent}
    const { uacct, email } = userList[0]
    const authToken = await signAuthToken({ uacct, email, maxl25: [] })
    const newPlaintextPassword  = 'an updatedPassword'

    e.headers = {
      authToken,
      newPlaintextPassword : atob(newPlaintextPassword)
    }

    const resp = await handler(e, ctx) as SRet
    const body = (JSON.parse(resp.body ?? 'null') as any)

    const uVerify = await user.getByID(uacct)
    // console.log({ resp })
    
    expect(resp.statusCode).toBe(200)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('user')
    expect(body.user.uacct).toEqual(uVerify.uacct)
    expect(
      user.password.isValidForUser({uacct, passwordPlainText: newPlaintextPassword})
    ).toBeTruthy()
  })

  test('Simul update of Email and DisplayName for Yoo', async () => {
    const e = {...putEvent}
    const { uacct, email } = userList[0]
    const authToken = await signAuthToken({ uacct, email, maxl25: [] })
    const newEmail = 'someOTherEmail@exmaple2.com'
    const newDisplayName = `I'm the New DisplayName`

    e.headers = {
      authToken,
      newEmail : encodeURIComponent(newEmail),
      newDisplayName : encodeURIComponent(newDisplayName),
    }

    const resp = await handler(e, ctx) as SRet
    const body = (JSON.parse(resp.body ?? 'null') as any)
    
    expect(resp.statusCode).toBe(200)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('user')
    expect(body.user.email).toEqual(newEmail)
    expect(body.user.displayName).toEqual(newDisplayName)
  })

  test('Refresh Backup Codes for Yoo', async () => {
    const e = {...putEvent}
    const { uacct, email } = userList[0]
    const authToken = await signAuthToken({ uacct, email, maxl25: [] })

    const uBefore = await user.getByID(uacct)
    e.headers = { authToken, refreshBackupCodes: 'true'}
    const resp = await handler(e, ctx) as SRet
    const body = (JSON.parse(resp.body ?? 'null') as any)
    const uAfter = await user.getByID(uacct)
    
    expect(resp.statusCode).toBe(200)
    expect(resp.isBase64Encoded).toBe(false)
    expect(body).toHaveProperty('user')
    expect(uBefore.backupCodes).not.toEqual(uAfter.backupCodes)
  })

  test('Add TOTP Option for Yoo', async () => {
    const e = {...putEvent}
    const { uacct, email } = userList[0]
    const authToken = await signAuthToken({ uacct, email, maxl25: [] })

    e.headers = { authToken, addTOTP: 'Add_Me_KEEP_ME_label'}

    const uBefore = await user.getByID(uacct)
    const resp = await handler(e, ctx) as SRet
    const body = (JSON.parse(resp.body ?? 'null') as any)
    const uAfter = await user.getByID(uacct)
    
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
    const e = {...event('PUT', '/users')}
    const { uacct, email } = userList[0]
    const authToken = await signAuthToken({ uacct, email, maxl25: [] })

    const uBefore = await user.getByID(uacct)
    e.headers = { authToken, addTOTP: 'Push/Pop_label'}
    await handler(e, ctx) as SRet
    const uMiddle = await user.getByID(uacct)
    
    e.headers = { authToken, rmTOTP: 'Push/Pop_label'}
    const respRm = await handler(e, ctx) as SRet
    const uAfter = await user.getByID(uacct)

    const body = (JSON.parse(respRm.body ?? 'null') as any)
    
    expect(respRm.statusCode).toBe(200)
    expect(respRm.isBase64Encoded).toBe(false)
    //
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
