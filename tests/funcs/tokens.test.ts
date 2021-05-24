/* globals describe test expect beforeEach afterEach beforeAll afterAll */

import handler from '../../src/funcs/tokens'
import { user, appTable } from '../../src/entities'
import { event, ctx } from '../gatewayData'

const users = [
  {
    uacct: 'tokens.user1@example.com',
    displayName: 'Yoo Sir',
    plaintextPassword: 'A not so very Bad password for Yoo'
  },
  {
    uacct: 'tokens.TimEst@example.com',
    displayName: 'T Est',
    plaintextPassword: 'A not so very Bad password for Tim'
  },
  {
    uacct: 'tokens.mdma@example.com',
    displayName: 'Molly',
    plaintextPassword: 'A not so very Bad password for Molly'
  }
]

beforeAll(async () => {
  // load table data
  await appTable.batchWrite(
    await Promise.all(
      users.map(async u => {
        const { plaintextPassword, ...usr } = u
        return user.ent.putBatch({
          ...usr,
          pwHash: await user.password.toHash(plaintextPassword)
        })
      })
    ))// end user batch
})

afterAll(async () => {
  // remove table data
  // so as to not interfere with other test-suites
  await appTable.batchWrite(
    users.map(u => user.ent.deleteBatch(u))
  )
})

/*
Overview
=============
* POST :: user -> starterToken -> (+2FA?)-> token
* GET :: token -> tokens
* PUT :: token -> token
* DELE :: token -> confimationMessage
*/

// test('EZ authed Get', async () => {
//   const e = event
//   e.requestContext.http.method = 'GET'
//   e.requestContext.http.path = '/tokens'
//   e.requestContext.http.protocol = 'https'
//   e.headers.token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjE2MTk3MjI1NjkifQ.eyJ1YWNjdCI6ImVyaWNkbW9vcmUiLCJpYXQiOjE2MjAwNzYzMzksImV4cCI6MTYyMDE2MjczOSwiaXNzIjoiY28uZmVkZXJhIn0.P_9Nxom_sWOKejaVZWN_X_R0TnApfGFJve4xAmmxZI4'

//   const resp = await handler(e, ctx)
//   console.log({ resp })
//   expect(resp).toEqual({})
// })

describe('POST /tokens', () => {
  // beforeEach(async () => {})
  // afterEach(async () => {})

  const tokenPathEvt = event()
  tokenPathEvt.requestContext.http.method = 'GET'
  tokenPathEvt.requestContext.http.protocol = 'https'
  tokenPathEvt.requestContext.http.path = '/tokens'

  test('Make a starter token for YOOSir - the starter + OOB gives you a valid token', async () => {
    tokenPathEvt.headers.token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjE2MTk3MjI1NjkifQ.eyJ1YWNjdCI6ImVyaWNkbW9vcmUiLCJpYXQiOjE2MjAwNzYzMzksImV4cCI6MTYyMDE2MjczOSwiaXNzIjoiY28uZmVkZXJhIn0.P_9Nxom_sWOKejaVZWN_X_R0TnApfGFJve4xAmmxZI4'
    const resp = await handler(tokenPathEvt, ctx)
    console.log({ resp })
    expect(resp).toEqual({})
  })
})

describe('GET /tokens', () => {
  beforeEach(async () => {})
  afterEach(async () => {})
  test('Get tokens available for Yoo', async () => {})
})

describe('PUT /tokens', () => {
  beforeEach(async () => {})
  afterEach(async () => {})
  test('Refresh token for Yoo', async () => {})
})

describe('DELETE /tokens', () => {
  beforeEach(async () => {})
  afterEach(async () => {})
  test('Remove a token for Yoo', async () => {})
})
