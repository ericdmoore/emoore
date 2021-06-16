/* globals test expect describe beforeAll afterAll */

import { link } from '../../src/entities/'
import { appTable } from '../../src/entities/entities'

// #region pure-tests
test('User - DynDB Inputs', async () => {
  const short = 'ex'
  const long = 'https://example.com'

  const t1 = await link.ent.put({ short, long }, { execute: false })
  expect(t1.Item.pk).toBe(link.pk({ short }))
  expect(t1.Item.sk).toBe(link.sk({ short }))

  const t2 = await link.ent.get({ short }, { execute: false })
  expect(t2.Key.pk).toBe(link.pk({ short }))
  expect(t2.Key.sk).toBe(link.sk({ short }))
})
// #endregion pure-tests

describe('Using a Test Harness', () => {
  const links = [
    { short: 'ex', long: 'https://example.com' },
    { short: 'example', long: 'https://example.com' }
  ]

  beforeAll(async () => {
    // edit userList
    // await Promise.all([])

    // write it
    await appTable.batchWrite(
      links.map(l => link.ent.putBatch(l))
    )
  })

  afterAll(async () => {
    await appTable.batchWrite(
      links.map(l => link.ent.deleteBatch(l))
    )
  })

  test('Get via Email', async () => {
    const { short } = links[0]
    const l = await link.get({ short })

    expect(l).toHaveProperty('short')
    expect(l).toHaveProperty('long')
    expect(l).toHaveProperty('cts')
    expect(l).toHaveProperty('mts')
    // can not guarentee these props
    // expect(l).toHaveProperty('ownerID')
    // expect(l).toHaveProperty('authzKey')
  })

  test.skip('GetBatch  Email', async () => {
  //   const respArr = await link.getBatch(links.map(l => l.short))
  //   // console.log(respArr)
  //   expect(respArr).toHaveLength(2)
  //   respArr.forEach(v => {
  //     expect(v).toHaveProperty('short')
  //     expect(v).toHaveProperty('long')
  //   })
  })
})
