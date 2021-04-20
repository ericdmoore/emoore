/* globals test expect  */
import {
  link,
  click,
  linkClickCountsByMin,
  linkClickCountsByTmb,
  linkClickCountsByHr,
  linkClickCountsByDay,
  linkClickCountsByMonth,
  linkClickCountsByYear,
  user,
  userAccess
} from '../../src/entities'
import dateFmt from '../../src/utils/dateFmt'

type Dict<T> = {[key:string]:T}
interface DynamoDBGetInputs{
    TableName: string
    Key: Dict<string>
}

// afterAll()

test('Link Click Bucket by Min - DynDB Inputs', async () => {
  const t = Date.now()
  const short = 'ddg'
  const idBucket = dateFmt('YYYYMMDDHHmm')(t)
  const r = await linkClickCountsByMin.ent.get({ short }, { execute: false }) as unknown as DynamoDBGetInputs

  expect(r).toHaveProperty('Key')
  expect(r).toHaveProperty('TableName')
  expect(r).toHaveProperty('Key.pk')
  expect(r).toHaveProperty('Key.sk')
  expect(r.Key.pk).toBe(linkClickCountsByMin.pk({ short }))
  expect(r.Key.sk).toBe(linkClickCountsByMin.sk({ bucketID: idBucket }))
})

test('Link Click Bucket by tmb - DynDB Inputs', async () => {
  const t = Date.now()
  const short = 'ddg'
  const idBucket = dateFmt('YYYYMMDDHHtmb')(t)
  const r = await linkClickCountsByTmb.ent.get({ short }, { execute: false }) as unknown as DynamoDBGetInputs

  expect(r).toHaveProperty('Key')
  expect(r).toHaveProperty('TableName')
  expect(r).toHaveProperty('Key.pk')
  expect(r).toHaveProperty('Key.sk')
  expect(r.Key.pk).toBe(linkClickCountsByTmb.pk({ short }))
  expect(r.Key.sk).toBe(linkClickCountsByTmb.sk({ bucketID: idBucket }))
})

test('Link Click Bucket by Hr - DynDB Inputs', async () => {
  const t = Date.now()
  const short = 'ddg'
  const idBucket = dateFmt('YYYYMMDDHH')(t)
  const r = await linkClickCountsByHr.ent.get({ short }, { execute: false }) as unknown as DynamoDBGetInputs

  expect(r).toHaveProperty('Key')
  expect(r).toHaveProperty('TableName')
  expect(r).toHaveProperty('Key.pk')
  expect(r).toHaveProperty('Key.sk')
  expect(r.Key.pk).toBe(linkClickCountsByHr.pk({ short }))
  expect(r.Key.sk).toBe(linkClickCountsByHr.sk({ bucketID: idBucket }))
})

test('Link Click Bucket by Day - DynDB Inputs', async () => {
  const t = Date.now()
  const short = 'ddg'
  const idBucket = dateFmt('YYYYMMDD')(t)
  const r = await linkClickCountsByDay.ent.get({ short }, { execute: false }) as unknown as DynamoDBGetInputs

  expect(r).toHaveProperty('Key')
  expect(r).toHaveProperty('TableName')
  expect(r).toHaveProperty('Key.pk')
  expect(r).toHaveProperty('Key.sk')
  expect(r.Key.pk).toBe(linkClickCountsByDay.pk({ short }))
  expect(r.Key.sk).toBe(linkClickCountsByDay.sk({ bucketID: idBucket }))
})

test('Link Click Bucket by Month - DynDB Inputs', async () => {
  const t = Date.now()
  const short = 'ddg'
  const idBucket = dateFmt('YYYYMM')(t)
  const r = await linkClickCountsByMonth.ent.get({ short }, { execute: false }) as unknown as DynamoDBGetInputs

  expect(r).toHaveProperty('Key')
  expect(r).toHaveProperty('TableName')
  expect(r).toHaveProperty('Key.pk')
  expect(r).toHaveProperty('Key.sk')
  expect(r.Key.pk).toBe(linkClickCountsByMonth.pk({ short }))
  expect(r.Key.sk).toBe(linkClickCountsByMonth.sk({ bucketID: idBucket }))
})

test('Link Click Bucket by Year - DynDB Inputs', async () => {
  const t = Date.now()
  const short = 'ddg'
  const idBucket = dateFmt('YYYY')(t)
  const r = await linkClickCountsByYear.ent.get({ short }, { execute: false }) as unknown as DynamoDBGetInputs

  expect(r).toHaveProperty('Key')
  expect(r).toHaveProperty('TableName')
  expect(r).toHaveProperty('Key.pk')
  expect(r).toHaveProperty('Key.sk')
  expect(r.Key.pk).toBe(linkClickCountsByYear.pk({ short }))
  expect(r.Key.sk).toBe(linkClickCountsByYear.sk({ bucketID: idBucket }))
})

test('Link - DynDB Inputs', async () => {
  const short = 'ddg'
  const r = await link.ent.get({ short }, { execute: false }) as unknown as DynamoDBGetInputs

  expect(r).toHaveProperty('Key')
  expect(r).toHaveProperty('TableName')
  expect(r).toHaveProperty('Key.pk')
  expect(r).toHaveProperty('Key.sk')
  expect(r.Key.pk).toBe(link.pk({ short }))
  expect(r.Key.sk).toBe(link.sk({ short }))
})

test('Click - DynDB Inputs', async () => {
  const short = 'ddg'
  const time = Date.now()
  const r = await click.ent.get({ short, time }, { execute: false }) as unknown as DynamoDBGetInputs

  expect(r).toHaveProperty('Key')
  expect(r).toHaveProperty('TableName')
  expect(r).toHaveProperty('Key.pk')
  expect(r).toHaveProperty('Key.sk')
  expect(r.Key.pk).toBe(click.pk({ short }))
  expect(r.Key.sk.slice(0, 8)).toBe(click.sk({ ts: time }).slice(0, 8))
})

test('User - DynDB Inputs', async () => {
  const uacct = 'ericdmoore'
  const t = await user.ent.get({ uacct }, { execute: false }) as unknown as DynamoDBGetInputs

  expect(t).toHaveProperty('Key')
  expect(t).toHaveProperty('TableName')
  expect(t).toHaveProperty('Key.pk')
  expect(t).toHaveProperty('Key.sk')
  expect(t.Key.pk).toBe(user.pk({ uacct }))
  expect(t.Key.sk).toBe(user.sk({ uacct }))
})

test('UserAccess - DynDB Inputs', async () => {
  const uacct = 'ericdmoore'
  const short = 'ddg'
  const t = await userAccess.ent.get({ short, uacct }, { execute: false }) as unknown as DynamoDBGetInputs

  expect(t).toHaveProperty('Key')
  expect(t).toHaveProperty('TableName')
  expect(t).toHaveProperty('Key.pk')
  expect(t).toHaveProperty('Key.sk')
  expect(t.Key.pk).toBe(userAccess.pk({ uacct }))
  expect(t.Key.sk).toBe(userAccess.sk({ short }))
})
