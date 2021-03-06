/* globals test describe test expect  beforeAll afterAll */
// import type { ClickInputs } from '../../server/entities/clicks'
import type { ExpandLinkHistory } from '../../server/funcs/expand'
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda'

import { nanoid } from 'nanoid'
import { addWeeks, addMonths } from 'date-fns'
import handler, { getLinkHistory } from '../../server/funcs/expand'
import { link, click, user, appTable, userAccess } from '../../server/entities'
import { event, ctx } from '../gatewayData'
// import type {BatchCreateElem}from '../../src/entities'
// import {sleep} from '../../server/utils/time'
import { JSONparse } from '../../server/utils/jsonParse'

const { geos, rotates, expires, hurdles, keepalive } = link.dynamicConfig
// const { log } = console
// const { stringify } = JSON
// const logJSON = (o:object) => log(stringify(o, null, 2))

// const repeat = (n:number) => async (repeatableFn:()=>Promise<any>) => {
//   for (let i = 0; i < n; i++) {
//     await repeatableFn()
//   }
// }

// const fromString = (s:string) => JSON.parse(s)

const max = (arr:number[]) => arr.reduce((p, c) => p > c ? p : c, -Infinity)

describe('Expand Link Data Setup', () => {
  // #region preamble
  const now = new Date()
  const DAYS_OF_MS = 86400000
  //   const WEEK_OF_MS = DAYS_OF_MS * 7

  // continent/country/region1/city
  const preLoadedUsers = [{
    uacct: nanoid(12),
    email: 'expanding.Eric@example.com',
    displayName: 'Ever Expanding Eric',
    passwordPlainText: 'password For Expanding Eric'
  }]

  const ipAddrs = [
    '75.8.99.75', // NA/US/TX/Dallas
    '216.59.146.164', // NA/US/TX/Gainseville
    '216.131.114.245' // EU/DE//Frankfurt
  ]
  const uaList = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36'
  ]
  const ipList = [
    '75.8.99.75', // NA/US/TX/Dallas
    '216.59.146.164', // NA/US/TX/Gainseville
    '216.131.114.245' // EU/DE//Frankfurt
  ]

  const linkDefs = [
    // 0
    {
      short: nanoid(5), // 1
      long: 'https://ericdmoore.com/1',
      ownerUacct: preLoadedUsers[0].uacct
    },
    // 1
    {
      short: nanoid(5), // 2
      long: 'https://ericdmoore.com/2',
      ownerUacct: preLoadedUsers[0].uacct
    },
    // 2
    {
      short: nanoid(5), // 3
      long: 'https://ericdmoore.com/default',
      ownerUacct: preLoadedUsers[0].uacct,
      dynamicConfig: geos([
        { at: 'DE', url: 't.co/DE' },
        { at: '*', url: 't.co/default' },
        {
          at: 'US',
          url: rotates([
            { at: 1, url: 'https://t.co/1' },
            { at: 2, url: 'https://t.co/2' },
            { at: 3, url: 'https://t.co/3' },
            { at: 4, url: 'https://t.co/4' }
          ])
        }
      ])
    },
    // 3
    {
      short: nanoid(5), // 4
      long: 'https://ericdmoore.com/default',
      ownerUacct: preLoadedUsers[0].uacct,
      dynamicConfig: geos([
        { at: 'DE', url: 't.co/DE' },
        { at: '*', url: 't.co/default' },
        {
          at: 'US',
          url: rotates([
            { at: 1, url: 'https://t.co/1' },
            { at: 2, url: 'https://t.co/2' },
            { at: 3, url: 'https://t.co/3' },
            { at: 4, url: 'https://t.co/4' }
          ])
        }
      ])
    },
    // 4
    {
      short: nanoid(5), // 5
      long: 'https://ericdmoore.com/4',
      ownerUacct: preLoadedUsers[0].uacct,
      dynamicConfig: geos([
        { at: 'DE', url: 't.co/DE' },
        { at: '*', url: 't.co/default' },
        {
          at: 'US',
          url: rotates([
            { at: 1, url: 'https://t.co/1' },
            { at: 2, url: 'https://t.co/2' },
            { at: 3, url: 'https://t.co/3' },
            { at: 4, url: 'https://t.co/4' }
          ])
        }
      ])
    },
    // 5
    {
      short: nanoid(5), // 6
      long: 'https://ericdmoore.com/5',
      ownerUacct: preLoadedUsers[0].uacct,
      dynamicConfig: keepalive([
        { at: 11, url: 'wontwork1' },
        { at: 11, url: 'wontwork2' }
      ])
    },
    // 6
    {
      short: nanoid(5), // 7
      long: 'https://ericdmoore.com/6',
      ownerUacct: preLoadedUsers[0].uacct,
      dynamicConfig: expires([
        { at: now.getTime() - 4 * DAYS_OF_MS, url: 'https://t.co/1.exp4dago' },
        { at: now.getTime() - 3 * DAYS_OF_MS, url: 'https://t.co/2.exp3dago' },
        { at: now.getTime() - 2 * DAYS_OF_MS, url: 'https://t.co/3.exp2dago' },
        { at: now.getTime() - 1 * DAYS_OF_MS, url: 'https://t.co/4.exp1dago' }
      ])
    },
    // 7
    {
      short: nanoid(5), // 8
      long: 'https://ericdmoore.com/7',
      ownerUacct: preLoadedUsers[0].uacct,
      dynamicConfig: hurdles([
        { at: 9, url: 'http://t.co/atleast9clicks' },
        { at: 1, url: 'http://t.co/the10thClick' },
        { at: 1, url: 'http://t.co/atleast1click' }
      ])
    },
    // 8
    {
      short: nanoid(5), // 9
      long: 'https://ericdmoore.com/8',
      ownerUacct: preLoadedUsers[0].uacct
    }
  ]

  const clicksForEachLinkGoingBackByDays = linkDefs.map(
    (link, i) => Array.from({ length: i + 1 }, (_, k) => { // clickArr size = its place in the array, each click goes back by [0-(n-1)] days
      const cts = now.getTime() - (k * DAYS_OF_MS) // added for removal purposes
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

  const moreClicksForLink8 = [
    // addWeeks(now, -1), //.getTime(),
    addWeeks(now, -2), // .getTime(),
    addWeeks(now, -3), // .getTime(),
    addWeeks(now, -4), // .getTime(),

    //
    addMonths(now, -1), // .getTime(),
    addMonths(now, -2), // .getTime(),
    addMonths(now, -3) // .getTime(),
  ].map((cts) => ({
    short: linkDefs[8].short,
    long: linkDefs[8].long,
    useragent: uaList[0],
    ip: ipList[1],
    cts
  })
  )

  //   const nineTimesBefore = repeat(9)
  //   const tenTimesBefore = repeat(10)

  beforeAll(async () => {
    // setup users
    await link.batch.put(...linkDefs)
    await user.batch.put(...preLoadedUsers)

    await click.batch.save(clicksForEachLinkGoingBackByDays)
    await click.batch.save(moreClicksForLink8)
  })
  afterAll(async () => {
    await appTable.batchWrite(preLoadedUsers.map(u => user.ent.deleteBatch(u)))
    await appTable.batchWrite(preLoadedUsers.map(l => userAccess.ent.deleteBatch(l)))
    await appTable.batchWrite(linkDefs.map(l => link.ent.deleteBatch(l)))

    await click.batch.remove(clicksForEachLinkGoingBackByDays)
    await click.batch.remove(moreClicksForLink8)
  })
  // #endregion preamble

  test('Link[8]: Expand Link History', async () => {
    const i = 8
    const link = linkDefs[i]
    const { short } = link

    const hist = await getLinkHistory(short)
    const lastClick = max(clicksForEachLinkGoingBackByDays.filter(c => c.short === short).map(c => c.cts as number))

    clicksForEachLinkGoingBackByDays.filter(c => c.cts >= now.getTime())

    // log(hist)

    expect(hist).toHaveProperty('allTimeExpansions')
    expect(hist).toHaveProperty('lastClick')
    // expect(hist).toHaveProperty('maxElapsedBetweenClicks')
    expect(hist).toHaveProperty('last24Hr')
    expect(hist).toHaveProperty('daysAgo')
    expect(hist).toHaveProperty('weeksAgo')
    expect(hist).toHaveProperty('monthsAgo')

    expect(hist.allTimeExpansions).toEqual(9 + moreClicksForLink8.length)
    expect(hist.lastClick).toEqual(lastClick)
    // expect(hist.maxElapsedBetweenClicks).toEqual(-1)
    expect(Array.isArray(hist.last24Hr)).toBe(true)
    expect(hist.last24Hr).toHaveLength(1) // since we are incrementing by days
    expect(hist.daysAgo).toHaveProperty('1')
    expect(hist.weeksAgo).toHaveProperty('1')
    expect(hist.monthsAgo).toHaveProperty('1')

    // expect(Object.values(hist.daysAgo)).toEqual([1, 1, 1, 1, 1, 1, 1])
    // expect(Object.values(hist.weeksAgo)).toEqual([2, 1, 1, 1])
    // expect(Object.values(hist.monthsAgo)).toEqual([1, 1, 1])
  })

  test('Link[0]: Basic Expansion ', async () => {
    const e = event('GET',
      '/expand/',
      { http: { sourceIp: ipAddrs[0] } },
      { short: linkDefs[0].short }
    )

    const resp = await handler(e, ctx)

    expect(resp).toHaveProperty('statusCode', 307)
    expect(resp).toHaveProperty('isBase64Encoded', false)
    expect(resp).toHaveProperty('headers')
    expect(resp.headers).toHaveProperty('Location')
    expect(resp.headers?.Location).toEqual('https://ericdmoore.com/1')
  })

  test('Link[1]: Basic Expansion ', async () => {
    const e = event('GET', '/expand/',
      { http: { sourceIp: ipAddrs[0] } },
      { short: linkDefs[1].short }
    )

    const resp = await handler(e, ctx)

    expect(resp).toHaveProperty('headers')
    expect(resp).toHaveProperty('statusCode', 307)
    expect(resp).toHaveProperty('isBase64Encoded', false)
    expect(resp.headers).toHaveProperty('Location')
    expect(resp.headers?.Location).toEqual('https://ericdmoore.com/2')
  })

  test('Link[2]: Expansion Dynamic  (already 3 clicks)', async () => {
    const e = event('GET', '/expand/',
      { http: { sourceIp: ipAddrs[0] } },
      { short: linkDefs[2].short }
    )

    const resp = await handler(e, ctx)

    expect(resp).toHaveProperty('headers')
    expect(resp).toHaveProperty('statusCode', 307)
    expect(resp).toHaveProperty('isBase64Encoded', false)
    expect(resp.headers).toHaveProperty('Location')
    expect(resp.headers?.Location).toEqual('https://t.co/3')
  })

  test('Link[3]: Expansion Dynamic Link (with 6 prior clicks)', async () => {
    // console.log("race condition?")

    const link = linkDefs[3]
    const e = event('GET', '/expand/',
      { http: { sourceIp: ipAddrs[0] } },
      { short: link.short }
    )
    const addThese = Array.from({ length: 2 }, () =>
      ({
        short: link.short,
        long: link.long,
        cts: now,
        useragent: uaList[0],
        ip: e.requestContext.http.sourceIp
      })
    )
    // const clickLen = (clicksForEachLinkGoingBackByDays as {short:string}[])
    //   .filter(l => l.short === link.short)
    //   .concat(addThese.filter(l => l.short === link.short))
    //   .length

    await click.batch.save(addThese)
    const resp = await handler(e, ctx)
    // const expLinkHist = fromString(resp.headers?.['X-History'].toString() ?? '{}') as ExpandLinkHistory

    expect(resp).toHaveProperty('headers')
    expect(resp).toHaveProperty('statusCode', 307)
    expect(resp).toHaveProperty('isBase64Encoded', false)
    expect(resp.headers).toHaveProperty('Location')
    expect(resp.headers?.Location).toEqual('https://t.co/4')
  })

  test('Link[4]: Expand a Geo Link that uses a CATCH_ALL / Wildcard?', async () => {
    // 2 is in use
    // change to 4?
    const e = event('GET', '/expand/',
      { http: { sourceIp: '1.1.1.1' } }, /* 1.1.1.1 is supposed to eval to AU which is undefined */
      { short: linkDefs[4].short }
    )

    const resp = await handler(e, ctx)

    expect(resp).toHaveProperty('headers')
    expect(resp).toHaveProperty('statusCode', 307)
    expect(resp).toHaveProperty('isBase64Encoded', false)
    expect(resp.headers).toHaveProperty('Location')
    expect(resp.headers?.Location).toEqual('t.co/default')
  })

  test('Link[5]: Expand a keepalive link (or remove the option)', async () => {
    const e = event('GET', '/expand/',
      { http: { sourceIp: '1.1.1.1' } }, /* 1.1.1.1 is supposed to eval to AU which is undefined */
      { short: linkDefs[5].short }
    )

    const resp = await handler(e, ctx)

    expect(resp).toHaveProperty('headers')
    expect(resp).toHaveProperty('statusCode', 307)
    expect(resp).toHaveProperty('isBase64Encoded', false)
    expect(resp.headers).toHaveProperty('Location')
    expect(resp.headers?.Location).toEqual('https://ericdmoore.com/5')
  })

  test('Link[6]: Expand an expiring link', async () => {
    const e = event('GET', '/expand/',
      { http: { sourceIp: '1.1.1.1' } }, /* 1.1.1.1 is supposed to eval to AU which is undefined */
      { short: linkDefs[6].short }
    )

    const resp = await handler(e, ctx)

    expect(resp).toHaveProperty('headers')
    expect(resp).toHaveProperty('statusCode', 307)
    expect(resp).toHaveProperty('isBase64Encoded', false)
    expect(resp.headers).toHaveProperty('Location')
    // all expired
    expect(resp.headers?.Location).toEqual('https://ericdmoore.com/6')
  })

  const dealingWithRaceCondition = (resp: APIGatewayProxyStructuredResultV2) => {
    const hist = JSON.parse(resp.headers?.['X-History'] as string | undefined ?? 'null') as ExpandLinkHistory

    if (Object.keys(hist).length === 0) {
      expect(true).toBe(false) // should not happen
    } else {
      // console.log({ allTimeClicks: hist.allTimeExpansions, url: resp.headers?.Location })
      switch (hist.allTimeExpansions) {
        case 8:
          expect(resp.headers?.Location).toEqual('http://t.co/atleast9clicks')
          break
        case 9: // 9clicks before THIS - means we just did the 10th click
          expect(resp.headers?.Location).toEqual('http://t.co/the10thClick')
          break
        case 10:
          expect(resp.headers?.Location).toEqual('http://t.co/atleast1click')
          break
        default:
          expect(true).toBe(false) // should never happen
          break
      }
    }
  }

  test('Link[7]: Expand a Hurdle Link', async () => {
    const link = linkDefs[7]
    const short = link.short
    const e = event('GET', '/expand/', { http: { sourceIp: '1.1.1.1' } }, { short })

    // from pre-handler
    // const prehist = await getLinkHistory(short)
    // console.log('prehist:',prehist)

    // handler side-effects
    const resp1 = await handler(e, ctx) // 9th click
    // for race conditions in DB
    // await sleep(400)

    const resp2 = await handler(e, ctx) // 10th click

    // for race conditions in DB
    // await sleep(400)

    const resp3 = await handler(e, ctx) // 11th click

    expect(resp1).toHaveProperty('headers')
    expect(resp1).toHaveProperty('statusCode', 307)
    expect(resp1).toHaveProperty('isBase64Encoded', false)
    expect(resp1.headers).toHaveProperty('Location')
    expect(resp1.headers?.Location).toEqual('http://t.co/atleast9clicks')

    // DB consistency issues createa race condition going fast for tests
    dealingWithRaceCondition(resp2)
    dealingWithRaceCondition(resp3)
  })

  test('Errors show up as appilcation/json', async () => {
    const e = event('GET', '/expand/', { http: { sourceIp: '1.1.1.1' } }, { short: 'Link_No_Exist_causes_Error_resp' })
    const resp = await handler(e, ctx) // 9th click
    const { err, data } = JSONparse(resp.body ?? 'null')

    expect(err).toBeFalsy()
    expect(data).toHaveProperty('errors')
    expect(Object.keys(resp?.headers ?? {}).map(s => s.toLowerCase())).toContain('content-type')
    expect(resp?.headers?.['content-type']).toEqual('application/json')
  })
})
