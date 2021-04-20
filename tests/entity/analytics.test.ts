/* globals test beforeAll  expect */

import { DynamoDB } from 'aws-sdk'
import { appTable, click } from '../../src/entities'
import chunky from '../../src/utils/batchChunks'

const msInDays = (n: number) => n * 24 * 3600_000
const randInt = (asBigAs:number) => Math.floor(Math.random() * asBigAs)
const randBetween = (lo: number, hi:number) => lo + (randInt(hi - lo))

const upTo400 = randBetween(10, 400)
const ts = Date.now()
const TEST_TIMEOUT = 45 * 1000

interface ClickPutPayload{
  short:string
  long:string
  useragent: {[k:string]: string}
}

const genRandClickData = async (
  fillItems:number,
  startingDateMs: number,
  finishDateMs: number, // absolute terms
  example:ClickPutPayload = {
    short: 'ddg',
    long: 'https://example.com',
    useragent: { deviceType: 'mobile' }
  }) => {
  const clickData = new Array(fillItems - 2).fill(0).map(
    () => click.ent.putBatch({ ...example, time: randBetween(startingDateMs, finishDateMs) })
  )
  clickData.push(click.ent.putBatch({ ...example, time: startingDateMs - 1000 }))
  clickData.push(click.ent.putBatch({ ...example, time: finishDateMs + 1000 }))

  for (const chnk of chunky(clickData)) {
    await appTable.batchWrite(chnk)
  }
}

beforeAll(async () => {
  console.log({ upTo400 })

  const dyn = new DynamoDB({
    region: 'us-east-1',
    endpoint: 'http://localhost:4567',
    credentials: {
      secretAccessKey: 'NEVER_REPLACE_THIS_WITH_A_REAL_KEY',
      accessKeyId: 'NEVER_REPLACE_THIS_WITH_A_REAL_SECRET'
    }
  })
  const localDC = new DynamoDB.DocumentClient({ service: dyn })

  // mutaes appTable
  // in case they are not connected
  appTable.DocumentClient = localDC
  click.ent.table.DocumentClient = localDC

  const zero = ts
  await genRandClickData(upTo400, zero, zero - msInDays(1)) // [now - 1d ago] with upTo400 Clicks
  await genRandClickData(upTo400, zero - msInDays(1), zero - msInDays(4)) // [1d ago - 4d ago]
  await genRandClickData(upTo400, zero - msInDays(4), zero - msInDays(14)) // [4d ago - 14d ago]
  await genRandClickData(upTo400, zero - msInDays(14), zero - msInDays(90)) // [14d ago - 90d ago]
}, TEST_TIMEOUT)

test('query DataStore for Dashboard.1 - 01 Day', async () => {
  const short = 'ddg'
  const { tsHi, tsLo } = { tsHi: ts, tsLo: ts - msInDays(1) }
  const r = await click.queryRange({ short, tsHi, tsLo })

  expect(r).toHaveProperty('Count')
  expect(r).toHaveProperty('ScannedCount')
  expect(r.Count).toBe(upTo400)
  expect(r.ScannedCount).toBe(upTo400)
}, TEST_TIMEOUT)

test('query DataStore for Dashboard.2 - 04 Days', async () => {
  const short = 'ddg'
  const { tsHi, tsLo } = { tsHi: ts, tsLo: ts - msInDays(4) }
  const r = await click.queryRange({ short, tsHi, tsLo })

  expect(r).toHaveProperty('Count')
  expect(r).toHaveProperty('ScannedCount')
  expect(r.Count).toBe(upTo400 * 2)
  expect(r.ScannedCount).toBe(upTo400 * 2)
}, TEST_TIMEOUT)

test('query DataStore for Dashboard.3 - 14 Days', async () => {
  const short = 'ddg'
  const { tsHi, tsLo } = { tsHi: ts, tsLo: ts - msInDays(14) }
  const r = await click.queryRange({ short, tsHi, tsLo })

  expect(r).toHaveProperty('Count')
  expect(r).toHaveProperty('ScannedCount')
  expect(r.Count).toBe(upTo400 * 3)
  expect(r.ScannedCount).toBe(upTo400 * 3)
}, TEST_TIMEOUT)

test('query DataStore for Dashboard.4 - 90 Days', async () => {
  const short = 'ddg'
  const { tsHi, tsLo } = { tsHi: ts, tsLo: ts - msInDays(90) }
  const r = await click.queryRange({ short, tsHi, tsLo })

  expect(r).toHaveProperty('Count')
  expect(r).toHaveProperty('ScannedCount')
  expect(r.Count).toBe(upTo400 * 4)
  expect(r.ScannedCount).toBe(upTo400 * 4)
}, TEST_TIMEOUT)

// 365 + 360 + 336 + 384 +  240 = 1685pts
