/* globals test expect */
import dateFmt from '../../src/utils/dateFmt'

console.log('tz Offset(s): ', (new Date()).getTimezoneOffset())

test('YYYY', () => {
  const t1 = 1618586020152
  expect(dateFmt('YYYY')(t1)).toBe('2021')
})

test('YYYYMM', () => {
  const t1 = 1618586020152
  expect(dateFmt('YYYYMM')(t1)).toBe('202104')
})

test('YYYYMMDD', () => {
  const t1 = 1618586020152
  expect(dateFmt('YYYYMMDD')(t1)).toBe('20210416')
})

test('YYYYMMDDHH', () => {
  const t1 = 1618586020152
  expect(dateFmt('YYYYMMDDHH')(t1)).toBe('2021041615')
})

test('YYYYMMDDHHmm', () => {
  const t1 = 1618586020152
  expect(dateFmt('YYYYMMDDHHmm')(t1)).toBe('202104161513')
})

test('YYYYMMDDHHtmb', () => {
  const t1 = 1618586020152
  const YYYY = '2021'
  const MM = '04'
  const DD = '16'
  const HH = '15'
  const tmb = '1'
  expect(dateFmt('YYYYMMDDHHtmb')(t1)).toBe(`${YYYY}${MM}${DD}${HH}${tmb}`)
})

test('YYYYMMDDHHqhr', () => {
  const t1 = 1618586020152
  const YYYY = '2021'
  const MM = '04'
  const DD = '16'
  const HH = '15'
  const qhr = 'a'
  expect(dateFmt('YYYYMMDDHHqhr')(t1)).toBe(`${YYYY}${MM}${DD}${HH}${qhr}`)
})
