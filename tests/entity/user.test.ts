/* globals test expect describe beforeAll afterAll */
import { user } from '../../src/entities/'
import { appTable } from '../../src/entities/entities'
import { authenticator } from 'otplib'
import bcrypt from 'bcrypt'

// #region interfaces

type Dict<T> = {[key:string]:T}
interface DynamoDBGetInputs{
    TableName: string
    Key: Dict<string>
}

interface oobToken{
  strategy:string
  uri:string
  secret:string | Buffer
  label?:string
}
interface User{
    uacct: string
    displayName: string
    passwordPlainText: string
    backupCodes: string[]
    oobTokens: oobToken[]
}
type UserList = User[]

// #endregion interfaces

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

test('User - gen 2FA', async () => {
  const uacct = 'ericdmoore'
  const t = await user.otp.gen2FA(uacct)
  // console.log(t)
  //
  // start with it removed
  // removed for storage reasons
  // expect(t).toHaveProperty('qr')
  expect(t).toHaveProperty('secret')
  expect(t).toHaveProperty('strategy')
  expect(t).toHaveProperty('uri')
  expect(t.strategy).toBe('TOTP')
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

describe('Using a Test Harness', () => {
  const userList = [
    {
      uacct: 'user.user@exmaple.com',
      displayName: 'Yoo Sir',
      passwordPlainText: 'myPassword1',
      backupCodes: [] as string[],
      oobTokens: [] as oobToken[]
    },
    {
      uacct: 'user.tim@exmaple.com',
      displayName: 'Timothy',
      passwordPlainText: 'myPassword2',
      backupCodes: [] as string[],
      oobTokens: [] as oobToken[]
    }
  ]
  const updateUserWithOTP = async (idx:number, userList: UserList) => {
    userList[idx].backupCodes = await user.otp.genBackups(8, 12)
    userList[idx].oobTokens = [await user.otp.gen2FA(userList[idx].uacct)]
  }
  beforeAll(async () => {
    // edit userList
    await Promise.all([
      updateUserWithOTP(0, userList),
      updateUserWithOTP(1, userList)
    ])

    // write it
    await appTable.batchWrite(
      await Promise.all(
        userList.map(
          async u => {
            const { passwordPlainText, ...usr } = u
            return user.ent.putBatch({
              ...usr,
              pwHash: await user.password.toHash(passwordPlainText)
            })
          })
      )
    )
  })

  afterAll(async () => {
    await appTable.batchWrite(
      userList.map(u => user.ent.deleteBatch(u))
    )
  })

  test('Get via Email', async () => {
    const { uacct } = userList[0]
    const u = await user.getByID(uacct)

    expect(u).toHaveProperty('backupCodes')
    expect(u).toHaveProperty('displayName')
    expect(u).toHaveProperty('oobTokens')
    expect(u).toHaveProperty('pwHash')
    expect(u).toHaveProperty('uacct')
  })

  test('Is Password Valid for User', async () => {
    const { uacct, passwordPlainText } = userList[0]
    const isValid = await user.password.isValidForUser({
      uacct,
      passwordPlainText
    })
    expect(isValid).toBe(true)
  })

  test('Is Password inValid for User', async () => {
    const { uacct } = userList[0]
    const isValid = await user.password.isValidForUser({
      uacct,
      passwordPlainText: 'BAD Password'
    })
    expect(isValid).toBe(false)
  })

  test('User has valid TOTP', async () => {
    const { uacct } = userList[0]
    const secret = userList[0].oobTokens[0].secret
    const newTOTP = authenticator.generate(secret as string)
    const isValid = await user.otp.isValidTOTP(
      uacct,
      newTOTP
    )
    expect(isValid).toBe(true)
  })

  test('User has invalid TOTP', async () => {
    const { uacct } = userList[0]
    const isValid = await user.otp.isValidTOTP(
      uacct,
      authenticator.generate('ABCDEADBEEF'))
    expect(isValid).toBe(false)
  })

  test('User has valid BackUp Code', async () => {
    const { uacct } = userList[0]
    const backupCode = userList[0].backupCodes[0]
    const isValid = await user.otp.isValidBackUpCode(
      uacct,
      backupCode
    )
    expect(isValid).toBe(true)
  })

  test('User has invalid BackUp Code', async () => {
    const { uacct } = userList[0]
    const isValid = await user.otp.isValidBackUpCode(
      uacct,
      'ABCDEADBEEF'
    )
    expect(isValid).toBe(false)
  })

  test('User has valid OTP', async () => {
    const { uacct } = userList[0]
    const backupCode = userList[0].backupCodes[0]
    const isValid = await user.otp.isValidOTP(
      uacct,
      backupCode
    )
    expect(isValid).toBe(true)
  })
})
