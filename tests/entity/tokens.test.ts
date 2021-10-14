/* globals describe test expect */
import { accessToken, acceptanceToken } from '../../server/auths/tokens'

describe('Access Tokens', () => {
  test('Basic Create Access Token ', async () => {
    const data = { uacct: '123', email: 'ex@example.com', last25: [] }
    const { token } = await accessToken().create(data)
    const { obj } = await accessToken().fromString(token)

    expect(token).toBeTruthy()
    expect(typeof token).toEqual('string')
    expect(obj).toEqual(data)
  })

  test('Verify an Invalid Access Token ', async () => {
    const { token } = await accessToken().create({ uacct: '123', email: 'ex@example.com', last25: [] })
    const shouldVerify = await accessToken().isVerified(token)

    expect(shouldVerify).toBeTruthy()

    await expect(
      accessToken().isVerified(token + '1234')
    ).rejects.toEqual(
      Error('Access Token Could Not Be Verfied')
    )
  })
})

describe('Acceptance Tokens', () => {
  test('Basic Create Acceptance Token ', async () => {
    const data = { displayName: 'Eric', email: 'ex@example.com', passwordPlainText: 'password' }
    const { token } = await acceptanceToken().create(data)
    const { obj } = await acceptanceToken().fromString(token)

    expect(token).toBeTruthy()
    expect(typeof token).toEqual('string')
    expect(obj).toEqual(data)
  })

  test('Invalid AcceptanceToken', async () => {
    const { token } = await acceptanceToken().create({
      displayName: 'Eric',
      email: 'ex@example.com',
      passwordPlainText: 'password'
    })
    const shouldVerify = await acceptanceToken().isVerified(token)
    expect(shouldVerify).toBeTruthy()

    await expect(
      acceptanceToken().isVerified(token + '1234')
    ).rejects.toEqual(
      Error('Access Token Could Not Be Verfied')
    )
  })
})
