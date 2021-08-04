/* globals test expect describe beforeAll afterAll */

import { link, ILink} from '../../src/entities/'
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

const linkDefs = [
      { short: 'ex', long: 'https://example1.com' },
      { short: 'example', long: 'https://example2.com' },
      { short: 'short', long: 'https://long-link-example.com' },
      { long: 'https://long-link-example.com'}
]
const _links:ILink[] = []

describe('Using a Test Harness', () => {
  beforeAll(async () => {
    // const links = await lanks
    const resLIst = await link.batch.put(...linkDefs)
    resLIst.forEach(l=>_links.push(l))
    
    // console.log('scan: ',  await appTable.scan() )
    // console.log('now batch get: ', await link.batch.get(links))
    // console.log('now query: ', await appTable.query( link.pk(links[0]),{beginsWith: link.sk(links[0])} ) )
  })

  afterAll(async () => {
    // const links = await lanks
    await appTable.batchWrite(linkDefs.map(l => link.ent.deleteBatch(l)) )
  })

  test('Verifiy Test Harness via the Example Link Hokey Pokey', async ()=>{
    const c = await link.batch.get([{short:'ex'}])
    expect(c.filter(v=>v.long === linkDefs[0].long )).toHaveLength(1)
  })

  test('Get via Short Code', async () => {
    const { short } = _links[0]
    const l = await link.get({ short })

    // console.log({l, l0: links[0]})

    expect(l).toHaveProperty('short')
    expect(l).toHaveProperty('long')
    expect(l).toHaveProperty('cts')
    expect(l).toHaveProperty('mts')
    expect(l).toHaveProperty('isDynamic')
    expect(l).toHaveProperty('ownerUacct')
  })

  test('Already Used Vanity URL Test', async () => {
    const l = await link.create({
      short:'ex', 
      long:'https://exmaple-of-unavailable-vainity.com'
    })

    await link.ent.put(l)
    const l2 = await link.get({short: l.short})

    expect(l2.short).not.toEqual('ex')
    expect(l2).toHaveProperty('short')
    expect(l2).toHaveProperty('long')
    expect(l2).toHaveProperty('cts')
    expect(l2).toHaveProperty('mts')
    expect(l2).toHaveProperty('isDynamic')
    expect(l2).toHaveProperty('ownerUacct')
  })

  test('Make a Dynamic URL', async () => {
    const {rotates, geos, hurdles, keepalive} = link.dynamicConfig

    const almostWinner:string = 'https://almostwinner.raffle.com'
    const youWin:string = 'https://youwin.raffle.com'

    const USraffleAutoClose = keepalive([
      { at:10000, url: hurdles([
          { at:10_000, url: almostWinner},
          { at:12_000, url: youWin},
        ])
      }
    ])

    const CANraffle = hurdles([
      { at:10_000, url: 'https://almostCanada.raffle.com'},
      { at:12_000, url: 'https://winnerCanada.raffle.com'},
    ])

    const linky = await link.create({
      short:'ex2', 
      long:'https://root-level-url-exmaple.com',
      dynamicConfig: geos([
        { at:'US', url: USraffleAutoClose},
        { at:'CAN', url: CANraffle},
        { at:'_', url: rotates([
          {at:1, url: USraffleAutoClose},
          {at:1, url: CANraffle}])
        }
      ])
    })

    // console.log(linky)

    await link.ent.put(linky)
    const l = await link.get({short: linky.short})

    expect(l.short).not.toEqual('ex') // since it already exists
    expect(l).toHaveProperty('short')
    expect(l).toHaveProperty('long')
    expect(l).toHaveProperty('cts')
    expect(l).toHaveProperty('mts')
    expect(l).toHaveProperty('isDynamic')
    expect(l).toHaveProperty('ownerUacct')
    expect(l).toHaveProperty('dynamicConfig')
  })

})
