/* globals test beforeAll  expect */
// import type { ChildProcess } from 'child_process'
import {
  appTable,
  link
  // click,
  // linkClickCountsByTmb,
  // linkClickCountsByHr,
  // linkClickCountsByDay,
  // linkClickCountsByMonth,
  // linkClickCountsByYear,
  // user,
  // userAccess
} from '../../src/entities'
// import localDynamo from 'local-dynamo'
import { DynamoDB } from 'aws-sdk'
// import type { Entity } from 'dynamodb-toolbox'
// import dateFmt from '../../src/utils/dateFmt'

// let dynamoLocal: ChildProcess

const TEST_TIMEOUT = 45 * 1000

beforeAll(async () => {
  // start local dynamo Svc?
  // dynamoLocal = localDynamo.launch(undefined, 4567)

  const dyn = new DynamoDB({ region: 'us-east-1', endpoint: 'http://localhost:4567' })
  link.ent.table.DocumentClient = new DynamoDB.DocumentClient({ service: dyn })

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

  // seed 1 link
  await link.ent.put({
    short: 'ddg',
    long: 'https://ddg.co',
    authzKey: '',
    ownerID: 'ericmoore',
    og: {
      'og:title': 'DuckDuckGo',
      'og:image': 'https://duckduckgo.com/assets/logo_homepage.normal.v108.svg',
      'og:image:type': 'image/svg',
      'og:image:width': '400',
      'og:image:height': '300',
      'og:image:alt': 'DuckDuckGo Logo'
    }
  })
}, TEST_TIMEOUT)

// afterAll(async () => {
//   dynamoLocal.kill('SIGTERM')
// })

test('GET prefilled link', async () => {
  const r = await link.get({ short: 'ddg' })

  expect(r).toHaveProperty('Item')
  expect(r).toHaveProperty('Item.cts')
  expect(r).toHaveProperty('Item.mts')
  expect(r).toHaveProperty('Item.short')
  expect(r).toHaveProperty('Item.long')
}, TEST_TIMEOUT)

test('Check on two links', async () => {
  await link.ent.put({ short: 'edm', long: 'https://im.ericdmoore.com' })
  const r = await appTable.query('l#edm', { beginsWith: 'l#' })

  expect(r).toHaveProperty('Items')
  expect(r).toHaveProperty('Count')
  expect(r).toHaveProperty('ScannedCount')
  expect(r.ScannedCount).toBe(1)
}, TEST_TIMEOUT)
