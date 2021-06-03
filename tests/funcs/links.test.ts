/* globals describe test expect beforeEach afterEach beforeAll afterAll */
import type { SRet } from '../../src/types'
import handler from '../../src/funcs/links'
import { event, ctx } from '../gatewayData'

beforeAll(async () => {
  // load some tables
})

afterAll(async () => {
  // remove table data
})

// GET requires setup data

test('EZ authed Get', async () => {
  const e = event('GET', '/links')
  e.headers.token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjE2MTk3MjI1NjkifQ.eyJ1YWNjdCI6ImVyaWNkbW9vcmUiLCJpYXQiOjE2MjAwNzYzMzksImV4cCI6MTYyMDE2MjczOSwiaXNzIjoiY28uZmVkZXJhIn0.P_9Nxom_sWOKejaVZWN_X_R0TnApfGFJve4xAmmxZI4'

  const resp = await handler(e, ctx) as SRet
  const body = JSON.parse(resp?.body ?? '{}')

  expect(resp).toHaveProperty('statusCode')
  expect(resp).toHaveProperty('isBase64Encoded')
  expect(resp).toHaveProperty('body')
  expect(body).toBeTruthy()
})

describe('GET /tokens', () => {
  beforeEach(async () => {})
  afterEach(async () => {})
})

describe('PUT /tokens', () => {
  beforeEach(async () => {})
  afterEach(async () => {})
})

describe('POST /tokens', () => {
  beforeEach(async () => {})
  afterEach(async () => {})
})

describe('DELETE /tokens', () => {
  beforeEach(async () => {})
  afterEach(async () => {})
})
