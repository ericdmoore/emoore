/* globals test describe test expect  beforeAll afterAll */

import { click } from '../../server/entities'

// eslint-disable-next-line no-unused-vars
const sleep = (N:number = 3000):Promise<number> => new Promise((resolve) => { setTimeout(() => resolve(N), N) })

test('PK', () => {
  const r = click.pk({ short: 'aaa' })
  expect(r).toBe('c#aaa')
})

test('SK', () => {
  const r = click.sk({ cts: 1629846577190 })
  expect(r.startsWith('tks#')).toBe(true)
})

test('Synth an Example Click', async () => {
  const c = await click.synth({
    ip: '75.8.99.75',
    long: 'https://ericdmoore.com',
    short: 'isme',
    useragent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:90.0) Gecko/20100101 Firefox/90.0'
  })

  expect(c).toHaveProperty('short')
  expect(c).toHaveProperty('useragent')
  expect(c).toHaveProperty('ip')
  expect(c).toHaveProperty('cts')

  expect(c).toHaveProperty('long')
  expect(c).toHaveProperty('geo')
})

test('Synth an Click For Yesterday', async () => {
  const useragent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:90.0) Gecko/20100101 Firefox/90.0'
  const cts = Date.now() - (24 * 3600)

  const c = await click.synth({
    ip: '75.8.99.75',
    long: 'https://ericdmoore.com',
    short: 'isme',
    useragent,
    cts
  })

  expect(c).toHaveProperty('short', 'isme')
  expect(c).toHaveProperty('ip', '75.8.99.75')
  expect(c).toHaveProperty('cts', cts)
  expect(c).toHaveProperty('long', 'https://ericdmoore.com')

  expect(c).toHaveProperty('useragent')
  expect(c.useragent).toHaveProperty('ua')
  expect(c.useragent).toHaveProperty('browser')
  expect(c.useragent).toHaveProperty('engine')
  expect(c.useragent).toHaveProperty('os')
  expect(c.useragent).toHaveProperty('device')
  expect(c.useragent).toHaveProperty('cpu')

  expect(c).toHaveProperty('geo')
  expect(c.geo).toHaveProperty('range')
  expect(c.geo).toHaveProperty('country')
  expect(c.geo).toHaveProperty('region')
  expect(c.geo).toHaveProperty('eu')
  expect(c.geo).toHaveProperty('timezone')
  expect(c.geo).toHaveProperty('city')
  expect(c.geo).toHaveProperty('ll')
  expect(c.geo).toHaveProperty('metro')
  expect(c.geo).toHaveProperty('area')
})

describe('Using the Local Dyanmo Service Test Harness', () => {
  const uaList = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36'
  ]

  const ipList = [
    '75.8.99.75', // NA/US/TX/Dallas
    '216.59.146.164', // NA/US/TX/Gainseville
    '216.131.114.245' // EU/DE//Frankfurt
  ]

  const linksList = [
    { short: 'me1', long: 'https://im.ericdmoore.com', giveItClicksNumbered: 1 },
    { short: 'me2', long: 'https://im.ericdmoore.com', giveItClicksNumbered: 2 },
    { short: 'me3', long: 'https://im.ericdmoore.com', giveItClicksNumbered: 3 },
    { short: 'me4', long: 'https://im.ericdmoore.com', giveItClicksNumbered: 4 }
  ]

  const clicks = linksList.map(
    (link, i) => Array.from({ length: i + 1 }, (_, k) => {
      const cts = Date.now() - (k * 1000) // needed for removal
      return {
        short: link.short,
        long: link.long,
        useragent: uaList[k % 2],
        ip: ipList[k % 3],
        sk: click.sk({ cts: cts }),
        cts
      }
    })
  ).flat(1)

  beforeAll(async () => {
    await click.batch.save(clicks)
  })

  afterAll(async () => {
    await click.batch.remove(clicks)
  })

  test('Add2 and Remove1 using l[0]', async () => {
    const now = Date.now()
    const cntBefore = await click.query.count(linksList[0].short, { stop: now + 10_000, start: now - 3600_000 })

    const addMe1 = {
      short: linksList[0].short,
      long: linksList[0].long,
      ip: '75.8.99.75',
      useragent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0',
      sk: click.sk()
    }

    await click.batch.save([addMe1])
    // await sleep(3000)

    const cntAfterAdd = await click.query.count(linksList[0].short, { stop: now + 10_000, start: now - 3600_000 })
    await expect(cntAfterAdd.Count ?? -1).toBeGreaterThan(cntBefore.Count ?? 0)

    await click.batch.remove([addMe1])
    // await sleep(4000)

    const cntAfterRm = await click.query.count(linksList[0].short, { stop: now + 10_000, start: now - 3600_000 })
    await expect(cntAfterRm.Count ?? -1).toEqual(cntBefore.Count ?? 0)
  })

  test('Query last24Hrs l[2]', async () => {
    const link = linksList[2]
    const { short } = link
    // const cl4l2 = clicks.filter(c=>c.short === short )
    // console.log({ link, cl4l2 })

    const l24 = await click.query.last24Hrs({ short, stop: Date.now() + 1000 })
    // console.log( l24.Items )
    expect(l24.Items?.length).toEqual(3)
  })

  test('Query byDays', async () => {
    const i = 3
    const { short } = linksList[i]
    // const cl4l2 = clicks.filter(c=>c.short === short )
    // console.log({ link:linksList[i], 'click.len': cl4l2.length })

    const days7 = await click.query.byDays({ short, goBack: 7, stop: Date.now() + 1000 })
    // console.log( days7.Items )
    expect(days7.Items?.length).toEqual(i + 1)
  })

  test('Query byWeeks', async () => {
    const i = 3
    const { short } = linksList[i]
    // const cl4l2 = clicks.filter(c=>c.short === short )
    // console.log({ link:linksList[i], 'click.len': cl4l2.length })

    const weeks2 = await click.query.byWeeks({ short, goBack: 2, stop: Date.now() + 1000 })
    // console.log( weeks2.Items )
    expect(weeks2.Items?.length).toEqual(i + 1)
  })

  test('Query byMonths', async () => {
    const i = 3
    const { short } = linksList[i]
    // const cl4l2 = clicks.filter(c=>c.short === short )
    // console.log({ link:linksList[i], 'click.len': cl4l2.length })

    const months1 = await click.query.byMonths({ short, goBack: 1, stop: Date.now() + 1000 })
    // console.log( months1.Items )
    expect(months1.Items?.length).toEqual(i + 1)
  })

  test('Query usingRange', async () => {
    const i = 3
    const { short } = linksList[i]
    // const cl4l2 = clicks.filter(c=>c.short === short )
    // console.log({ link:linksList[i], 'click.len': cl4l2.length })

    const stop = Date.now() + 1000
    const start1HrAgo = stop - 3600_000

    const dRange = await click.query.usingRange({ short, stop, start: start1HrAgo })
    // console.log( dRange.Items )
    expect(dRange.Items?.length).toEqual(i + 1)
  })
})
