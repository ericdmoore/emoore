/* globals test expect describe beforeAll afterAll */
import { user, UseBase } from '../../server/entities'
// import { appTable } from '../../server/entities/entities'
import { authenticator } from 'otplib'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

// #region interfaces

type Dict<T> = {[key:string]:T}
interface DynamoDBGetInputs{
    TableName: string
    Key: Dict<string>
}

// interface oobToken{
//   strategy:string
//   uri:string
//   secret:string | Buffer
//   label?:string
// }

// interface User{
//     uacct: string
//     displayName: string
//     passwordPlainText: string
//     backupCodes: string[]
//     oobTokens: oobToken[]
// }
// type UserList = User[]

// #endregion interfaces

// #region pure-tests
test('User - DynDB Inputs', async () => {
  const uacct = 'ericdmoore'
  const t = await user.ent.get({ uacct }, { execute: false }) as unknown as DynamoDBGetInputs

  expect(t).toHaveProperty('Key')
  expect(t).toHaveProperty('TableName')
  expect(t).toHaveProperty('Key.pk')
  expect(t).toHaveProperty('Key.sk')
  expect(t.Key.pk).toBe(user.pk({ uacct }))
  expect(t.Key.sk).toBe(user.sk({ uacct }))
})

test('User - OTP create TOTP Option', async () => {
  //   const email = 'ericdmoore'
  const t = await user.otp.createTOTPOption()
  expect(t).toHaveProperty('secret')
  expect(t).toHaveProperty('strategy')
  expect(t.strategy).toBe('TOTP')
})

test('User - gen 2FA.TOTP', async () => {
  const uacct = 'ericdmoore'
  const t = await user.otp.gen2FA(uacct)
  //
  // start with it removed
  // removed for storage reasons
  // expect(t).toHaveProperty('qr')
  expect(t).toHaveProperty('secret')
  expect(t).toHaveProperty('strategy')
  expect(t).toHaveProperty('uri')
  expect(t.strategy).toBe('TOTP')
})

test('User - gen 2FA.U2F', async () => {
  const uacct = 'ericdmoore'
  const t = await user.otp.gen2FA(uacct, 'U2F')
  //
  // start with it removed
  // removed for storage reasons
  // expect(t).toHaveProperty('qr')
  expect(t).toHaveProperty('secret')
  expect(t).toHaveProperty('strategy')
  expect(t).toHaveProperty('uri')
  expect(t.strategy).toBe('U2F')
})

test('User - gen 2FA.SMS', async () => {
  const uacct = 'ericdmoore'
  const t = await user.otp.gen2FA(uacct, 'SMS')
  //
  // start with it removed
  // removed for storage reasons
  // expect(t).toHaveProperty('qr')
  expect(t).toHaveProperty('secret')
  expect(t).toHaveProperty('strategy')
  expect(t).toHaveProperty('uri')
  expect(t.strategy).toBe('SMS')
})

test('User - Mint User ID', async () => {
  const uacct = await user.mintUserID()
  expect(uacct).toHaveLength(24)
})

test('User - gen backups', async () => {
//   const email = 'ericdmoore'
  const numCodes = 8
  const codeLen = 10
  const codes = await user.otp.genBackups(numCodes, codeLen)
  //   console.log(codes)
  expect(codes).toHaveLength(numCodes)
  codes.forEach(v => {
    expect(v).toHaveLength(codeLen)
  })
})

test('User - password Hash', async () => {
  const plain = 'my easy password'
  const hash = await user.password.toHash(plain)
  const c = await bcrypt.compare(plain, hash)
  expect(c).toBe(true)
})
// #endregion pure-tests

describe('Using a Test Harness', () => {
  const userList = [
    {
      uacct: nanoid(),
      displayName: 'Yoo Sir',
      passwordPlainText: 'myPassword1',
      email: 'user.user@example.com',
      oobTokens: [{ secret: 'DEADBEEF1', strategy: 'TOTP', uri: '', label: 'myLabelYS' }],
      backupCodes: ['ys1', 'ys2', 'ys3', 'ys4', 'ys5']
    },
    {
      uacct: nanoid(),
      displayName: 'Timothy',
      passwordPlainText: 'myPassword2',
      email: 'user.tim.test@example.com',
      oobTokens: [{ secret: 'DEADBEEF2', strategy: 'TOTP', uri: '', label: 'myLabelTim' }],
      backupCodes: ['', '', '', '', '']
    }
  ] as UseBase[]

  beforeAll(async () => {
    await user.batch.put(...userList)
  })

  afterAll(async () => {
    await user.batch.rm(...userList)
  })

  test('Get via Email', async () => {
    const { uacct } = userList[0]
    const u = await user.getByID(uacct as string)

    expect(u).toHaveProperty('backupCodes')
    expect(u).toHaveProperty('displayName')
    expect(u).toHaveProperty('oobTokens')
    expect(u).toHaveProperty('pwHash')
    expect(u).toHaveProperty('uacct')
  })

  test('User - Mint User ID w/ Collision', async () => {
    const { uacct } = userList[0]
    const newuserAcct = await user.mintUserID(uacct)
    expect(newuserAcct).toHaveLength(27)
  })

  test('Can Lookup via Email', async () => {
    const { email } = userList[0]
    const u = await user.lookupVia({ typeID: 'email', exID: email })
    expect(u).toBeTruthy()
  })

  test('Is Password Valid for User', async () => {
    const { uacct, passwordPlainText } = userList[0]
    const isValid = await user.password.isValidForUser({
      uacct: uacct as string,
      passwordPlainText
    })
    expect(isValid).toBe(true)
  })

  test('Is Password inValid for User', async () => {
    const { uacct } = userList[0]
    const isValid = await user.password.isValidForUser({
      uacct: uacct as string,
      passwordPlainText: 'BAD Password'
    })
    expect(isValid).toBe(false)
  })

  test('User has valid TOTP', async () => {
    const { uacct } = userList[0]
    const secret = userList?.[0]?.oobTokens?.[0]?.secret
    const newTOTP = authenticator.generate(secret as string)
    const isValid = await user.otp.isValidTOTP(
      uacct as string,
      newTOTP
    )
    expect(isValid).toBe(true)
  })

  test('User has invalid TOTP', async () => {
    const { uacct } = userList[0]
    const isValid = await user.otp.isValidTOTP(
      uacct as string,
      authenticator.generate('ABCDEADBEEF'))
    expect(isValid).toBe(false)
  })

  test('User has valid BackUp Code', async () => {
    const { uacct } = userList[0]
    const backupCode = userList[0].backupCodes?.[0]
    const isValid = await user.otp.isValidBackUpCode(
      uacct as string,
      backupCode as string
    )
    expect(isValid).toBe(true)
  })

  test('User has invalid BackUp Code', async () => {
    const { uacct } = userList[0]
    const isValid = await user.otp.isValidBackUpCode(
      uacct as string,
      'ABCDEADBEEF'
    )
    expect(isValid).toBe(false)
  })

  test('User has valid OTP', async () => {
    const { uacct } = userList[0]
    const backupCode = userList[0].backupCodes?.[0]
    const isValid = await user.otp.isValidOTP(
      uacct as string,
      backupCode as string
    )
    expect(isValid).toBe(true)
  })
})
