/* globals test describe test expect  */
import { userAccess } from '../../server/entities/userAccess'
import type { IUserAccess } from '../../server/entities/userAccess'

describe('User Access Entity', () => {
  test('User Access Get Params', async () => {
    const paramGet = await userAccess.batch.params.get({ uacct: 'uacctExample', short: 'shortP1' })
    // console.dir({paramGet})
    expect(paramGet).toBeTruthy()
  })

  test('User Access Put Params', async () => {
    const paramPut = await userAccess.batch.params.put({ long: 'http://long.com', short: 'l', uacct: 'uacct' })
    // console.dir(paramPut)
    expect(paramPut).toBeTruthy()
  })

  test('User Access Put Params', async () => {
    const paramPut = await userAccess.batch.params.put({ long: 'http://long.com', short: 'l', uacct: 'uacct' })
    // console.dir(paramPut)
    expect(paramPut).toBeTruthy()
  })

  test('Extra Params Throw Errors', () => {
    try {
      const putParam = userAccess.batch.params.put({
        long: 'http://long.com',
        short: 'l',
        uacct: 'uacct',
        ownerAcct: 'ShouldNotPass'
      } as IUserAccess)
      expect('passed function').toBe('throwing exceptions')
    } catch (e) {
      expect('caught').toBe('caught')
    }
  })
})
