/* globals test expect beforeAll  afterAll  */

// import { DynamoDB } from 'aws-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
// import { DynamoDB } from 'aws-sdk'
import { appTable, click } from '../../src/entities'
import chunky from '../../src/utils/batchChunks'

const msInDays = (n: number) => n * 86_400_000
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

type Dict<T> = {[key:string]:T}

const grabItems = (i: Dict <DocumentClient.WriteRequest>[]): DocumentClient.PutItemInputAttributeMap[] => i.reduce(
  (p, obj) => [...p, ...Object.values(obj).map(v => v.PutRequest?.Item ?? undefined)], [] as (DocumentClient.PutItemInputAttributeMap | undefined)[]
).filter(e => !!e) as DocumentClient.PutItemInputAttributeMap[]

const genRandClickData = async (
  fillItems:number,
  startingDateMs: number,
  finishDateMs: number, // absolute terms
  example:ClickPutPayload = {
    short: 'ddg',
    long: 'https://example.com',
    useragent: { deviceType: 'mobile' }
  }) => {
  const clickData = new Array(fillItems - 2)
    .fill(0)
    .map(() =>
      click.ent.putBatch({
        ...example,
        cts: randBetween(startingDateMs, finishDateMs)
      })
    )
  clickData.push(click.ent.putBatch({ ...example, cts: startingDateMs - 1000}))
  clickData.push(click.ent.putBatch({ ...example, cts: finishDateMs + 1000}))

  const regenData = grabItems(clickData)
  // console.log(regenData.slice(0, 2))

  for (const chnk of chunky(clickData)) {
    await appTable.batchWrite(chnk)
  }

  return regenData
}

let regenedClickData = [] as DocumentClient.PutItemInputAttributeMap[]

beforeAll(async () => {
  // const dynDB = new DynamoDB(config)
  // console.log(appTable.entities)
  // console.log({ AWS_KEY: process.env.AWS_KEY })
  // console.log({ dynDB })
  // console.log({ name: appTable.name })
  // console.log(await dynDB.describeTable({ TableName: appTable.name }).promise().catch(console.error))
  console.log({ upTo400 })

  const zero = ts
  const items1 = await genRandClickData(upTo400, zero,               zero - msInDays(1)) // [now - 1d ago] with upTo400 Clicks
  const items2 = await genRandClickData(upTo400, zero - msInDays(1), zero - msInDays(4)) // [1d ago - 4d ago
  const items3 = await genRandClickData(upTo400, zero - msInDays(4), zero - msInDays(14)) // [4d ago - 14d ago]
  const items4 = await genRandClickData(upTo400, zero - msInDays(14), zero - msInDays(90)) // [14d ago - 90d ago]

  regenedClickData = [...items1, ...items2, ...items3, ...items4]
  // console.log(regenedClickData.slice(0, 10))
}, TEST_TIMEOUT)

afterAll(async () => {
  for (const chnk of chunky(regenedClickData)) {
    await appTable.batchWrite(
      chnk.map(item => click.ent.deleteBatch(item))
    )
  }
}, TEST_TIMEOUT)

test('query DataStore for Dashboard.1 - 01 Day', async () => {
  const short = 'ddg'
  const { tsHi, tsLo } = { tsHi: ts, tsLo: ts - msInDays(1) }
  const r = await click.query.usingRange({ short, start: tsLo, stop:tsHi })

  expect(r).toHaveProperty('Count')
  expect(r).toHaveProperty('ScannedCount')
  expect(r.Count).toBe(upTo400)
  expect(r.ScannedCount).toBe(upTo400)
}, TEST_TIMEOUT)

test('query DataStore for Dashboard.2 - 04 Days', async () => {
  const short = 'ddg'
  const { tsHi, tsLo } = { tsHi: ts, tsLo: ts - msInDays(4) }
  const r = await click.query.usingRange({ short, start: tsLo, stop:tsHi })

  expect(r).toHaveProperty('Count')
  expect(r).toHaveProperty('ScannedCount')
  expect(r.Count).toBe(upTo400 * 2)
  expect(r.ScannedCount).toBe(upTo400 * 2)
}, TEST_TIMEOUT)

test('query DataStore for Dashboard.3 - 14 Days', async () => {
  const short = 'ddg'
  const { tsHi, tsLo } = { tsHi: ts, tsLo: ts - msInDays(14) }
  const r = await click.query.usingRange({ short, start: tsLo, stop:tsHi })

  expect(r).toHaveProperty('Count')
  expect(r).toHaveProperty('ScannedCount')
  expect(r.Count).toBe(upTo400 * 3)
  expect(r.ScannedCount).toBe(upTo400 * 3)
}, TEST_TIMEOUT)

test('query DataStore for Dashboard.4 - 90 Days', async () => {
  const short = 'ddg'
  const { tsHi, tsLo } = { tsHi: ts, tsLo: ts - msInDays(90) }
  const r = await click.query.usingRange({ short, start: tsLo, stop:tsHi })

  expect(r).toHaveProperty('Count')
  expect(r).toHaveProperty('ScannedCount')
  expect(r.Count).toBe(upTo400 * 4)
  expect(r.ScannedCount).toBe(upTo400 * 4)
}, TEST_TIMEOUT)

// 365 + 360 + 336 + 384 +  240 = 1685pts
