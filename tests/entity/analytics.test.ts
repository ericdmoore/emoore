/* globals test beforeAll  expect */
// import type { ChildProcess } from 'child_process'

import { DynamoDB } from 'aws-sdk'
// import localDynamo from 'local-dynamo'

import { appTable, click } from '../../src/entities'
import chunky from '../../src/utils/batchChunks'
// import dateFmt from '../../src/utils/dateFmt'

// let dynamoLocal: ChildProcess

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

// afterAll(() => dynamoLocal.kill('SIGTERM'))

beforeAll(async () => {
  console.log({ upTo400 })
  // start local Dynamo Svc
  // and set the internals of the Entity framework to use the locally configured reader/writer
  // dynamoLocal = await localDynamo.launch(undefined, 4567)
  const dyn = new DynamoDB({ region: 'us-east-1', endpoint: 'http://localhost:4567' })
  const localDC = new DynamoDB.DocumentClient({ service: dyn })

  // mutaes appTable
  appTable.DocumentClient = localDC
  // in case they are not connected
  click.ent.table.DocumentClient = localDC

  // await dyn.createTable({
  //   TableName: 'emooreAppTable',
  //   AttributeDefinitions: [
  //     { AttributeName: 'pk', AttributeType: 'S' },
  //     { AttributeName: 'sk', AttributeType: 'S' }
  //   ],
  //   KeySchema: [
  //     { AttributeName: 'pk', KeyType: 'HASH' },
  //     { AttributeName: 'sk', KeyType: 'RANGE' }
  //   ],
  //   BillingMode: 'PAY_PER_REQUEST',
  //   ProvisionedThroughput: {
  //     ReadCapacityUnits: 5,
  //     WriteCapacityUnits: 5
  //   }
  // }).promise()

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
