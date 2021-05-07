/* globals test beforeAll  expect */
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
} from '../../src/entities/entities'

import { DynamoDB } from 'aws-sdk'
// import type { Entity } from 'dynamodb-toolbox'
// import dateFmt from '../../src/utils/dateFmt'

const TEST_TIMEOUT = 45 * 1000

beforeAll(async () => {
  const dyn = new DynamoDB({
    region: 'us-east-1',
    endpoint: 'http://localhost:4567',
    credentials: {
      secretAccessKey: 'NEVER_REPLACE_THIS_WITH_A_REAL_KEY',
      accessKeyId: 'NEVER_REPLACE_THIS_WITH_A_REAL_SECRET'
    }
  })

  link.ent.table.DocumentClient = new DynamoDB.DocumentClient({ service: dyn })

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
