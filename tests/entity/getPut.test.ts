/* globals test beforeAll  expect */
import {
  link,
  appTable
} from '../../server/entities'

// import type { Entity } from 'dynamodb-toolbox'
// import dateFmt from '../../src/utils/dateFmt'

const TEST_TIMEOUT = 45 * 1000

beforeAll(async () => {
  // seed 1 link
  await link.ent.put(
    await link.create({
      short: 'ddg',
      long: 'https://ddg.co',
      ownerUacct: 'ericdmoore',
      metatags: {
        'og:title': 'DuckDuckGo',
        'og:image': 'https://duckduckgo.com/assets/logo_homepage.normal.v108.svg',
        'og:image:type': 'image/svg',
        'og:image:width': '400',
        'og:image:height': '300',
        'og:image:alt': 'DuckDuckGo Logo'
      }
    }))
}, TEST_TIMEOUT)

test('GET prefilled link', async () => {
  const r = await link.get({ short: 'ddg' })
  expect(r).toHaveProperty('cts')
  expect(r).toHaveProperty('mts')
  expect(r).toHaveProperty('short')
  expect(r).toHaveProperty('long')
}, TEST_TIMEOUT)

test('Check on two links', async () => {
  await link.ent.put({
    short: 'edm',
    long: 'https://im.ericdmoore.com'
  })
  const r = await appTable.query('l#edm', { beginsWith: 'l#' })

  expect(r).toHaveProperty('Items')
  expect(r).toHaveProperty('Count')
  expect(r).toHaveProperty('ScannedCount')
  expect(r.ScannedCount).toBe(1)
}, TEST_TIMEOUT)
