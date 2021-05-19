/* globals test expect describe beforeAll afterAll */
import { user } from '../../src/entities/'
import { appTable } from '../../src/entities/entities'
import { authenticator } from 'otplib'
import bcrypt from 'bcrypt'

type Dict<T> = {[key:string]:T}
interface DynamoDBGetInputs{
    TableName: string
    Key: Dict<string>
}
interface User{
    email: string
    displayName: string
    passwordPlainText: string
    backupCodes: string[]
    oobTokens: {strategy:string, secret:string}[]
}
type UserList = User[]

test('User - DynDB Inputs', async () => {
  const email = 'ericdmoore'
  const t = await user.ent.get({ email }, { execute: false }) as unknown as DynamoDBGetInputs

  expect(t).toHaveProperty('Key')
  expect(t).toHaveProperty('TableName')
  expect(t).toHaveProperty('Key.pk')
  expect(t).toHaveProperty('Key.sk')
  expect(t.Key.pk).toBe(user.pk({ email }))
  expect(t.Key.sk).toBe(user.sk({ email }))
})

test('User - OTP create TOTP Option', async () => {
  //   const email = 'ericdmoore'
  const t = await user.otp.createTOTPOption()
  expect(t).toHaveProperty('secret')
  expect(t).toHaveProperty('strategy')
  expect(t.strategy).toBe('TOTP')
})

test('User - gen 2FA', async () => {
  const email = 'ericdmoore'
  const t = await user.otp.gen2FA(email)
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
      email: 'user.user@exmaple.com',
      displayName: 'Yoo Sir',
      passwordPlainText: 'myPassword1',
      backupCodes: [] as string[],
      oobTokens: [] as {strategy:string, secret:string}[]
    },
    {
      email: 'user.tim@exmaple.com',
      displayName: 'Timothy',
      passwordPlainText: 'myPassword2',
      backupCodes: [] as string[],
      oobTokens: [] as {strategy:string, secret:string}[]
    }
  ]
  const updateUserWithOTP = async (idx:number, userList: UserList) => {
    userList[idx].backupCodes = await user.otp.genBackups(8, 12)
    userList[idx].oobTokens = [await user.otp.gen2FA(userList[idx].email)]
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
    const { email } = userList[0]
    const u = await user.getViaEmail({ email })

    expect(u).toHaveProperty('email')
    expect(u).toHaveProperty('displayName')
    expect(u).toHaveProperty('pwHash')
  })

  test('Is Password Valid for User', async () => {
    const { email, passwordPlainText } = userList[0]
    const isValid = await user.password.isValidForUser({
      email,
      passwordPlainText
    })
    expect(isValid).toBe(true)
  })

  test('Is Password inValid for User', async () => {
    const { email } = userList[0]
    const isValid = await user.password.isValidForUser({
      email,
      passwordPlainText: 'BAD Password'
    })
    expect(isValid).toBe(false)
  })

  test('User has valid TOTP', async () => {
    const { email } = userList[0]
    const secret = userList[0].oobTokens[0].secret
    const newTOTP = authenticator.generate(secret)
    const isValid = await user.otp.isValidTOTP(
      email,
      newTOTP
    )
    expect(isValid).toBe(true)
  })

  test('User has invalid TOTP', async () => {
    const { email } = userList[0]
    const isValid = await user.otp.isValidTOTP(
      email,
      authenticator.generate('ABCDEADBEEF'))
    expect(isValid).toBe(false)
  })

  test('User has valid BackUp Code', async () => {
    const { email } = userList[0]
    const backupCode = userList[0].backupCodes[0]
    const isValid = await user.otp.isValidBackUpCode(
      email,
      backupCode
    )
    expect(isValid).toBe(true)
  })

  test('User has invalid BackUp Code', async () => {
    const { email } = userList[0]
    const isValid = await user.otp.isValidBackUpCode(
      email,
      'ABCDEADBEEF'
    )
    expect(isValid).toBe(false)
  })

  test('User has valid OTP', async () => {
    const { email } = userList[0]
    const backupCode = userList[0].backupCodes[0]
    const isValid = await user.otp.isValidOTP(
      email,
      backupCode
    )
    expect(isValid).toBe(true)
  })
})
