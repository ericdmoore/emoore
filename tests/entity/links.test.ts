/* globals test expect describe beforeAll afterAll */

import { link } from '../../src/entities/'
import { appTable } from '../../src/entities/entities'

// #region pure-tests
test('User - DynDB Inputs', async () => {
  const short = 'ex'
  const long = 'https://example.com'

  const l = await link.create({ short, long }) 
  const t1 = await link.ent.put( l, { execute: false })
  expect(t1.Item.pk).toBe(link.pk({ short }))
  expect(t1.Item.sk).toBe(link.sk({ short }))

  const t2 = await link.ent.get({ short }, { execute: false })
  expect(t2.Key.pk).toBe(link.pk({ short }))
  expect(t2.Key.sk).toBe(link.sk({ short }))
})
// #endregion pure-tests

const lanks = ( async ()=>[
  { short: 'ex', long: 'https://example1.com' },
  { short: 'example', long: 'https://example2.com' },
  { short: 'short', long: 'https://long-link-example.com' },
  await link.create({long: 'https://long-link-example.com'})
])()

describe('Using a Test Harness', () => {
  beforeAll(async () => {
    const links = await lanks
    await link.batch.create(links)
    // console.log('scan: ',  await appTable.scan() )
    // console.log('now batch get: ', await link.batch.get(links))
    console.log('now query: ', await appTable.query( link.pk(links[0]),{beginsWith: link.sk(links[0])} ) )
  },9999)

  afterAll(async () => {
    const links = await lanks
    await appTable.batchWrite( links.map(l => link.ent.deleteBatch(l)) )
  })

  test('Verifiy Test Harness via the Example Link Hokey Pokey', async ()=>{
    const links = await lanks
    const c = await link.batch.get([{short:'ex'}])
    console.log(c)
    expect(c.filter(v=>v.long === links[0].long )).toHaveLength(1)
  },9000)

  test.skip('Get via Short Code', async () => {
    const links = await lanks
    const { short } = links[0]
    const l = await link.get({ short })

    console.log(l)

    expect(l).toHaveProperty('short')
    expect(l).toHaveProperty('long')
    expect(l).toHaveProperty('cts')
    expect(l).toHaveProperty('mts')
    // can not guarentee these props
    // expect(l).toHaveProperty('ownerID')
    // expect(l).toHaveProperty('authzKey')
  })

  test.skip('GetBatch Email', async () => {
  //   const respArr = await link.getBatch(links.map(l => l.short))
  //   // console.log(respArr)
  //   expect(respArr).toHaveLength(2)
  //   respArr.forEach(v => {
  //     expect(v).toHaveProperty('short')
  //     expect(v).toHaveProperty('long')
  //   })
  })
})
