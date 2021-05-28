/* globals describe test expect beforeEach afterEach beforeAll afterAll */

import handler from '../../src/funcs/tokens'
import { user, appTable } from '../../src/entities'
import { event, ctx } from '../gatewayData'
import { nanoid } from 'nanoid'
import { userLookup } from '../../src/entities/userLookup'
import { atob } from '../../src/utils/base64'

const userList = [
  {
    email: 'tokens.user1@example.com',
    uacct: nanoid(12),
    displayName: 'Yoo Sir',
    plaintextPassword: 'A not so very Bad password for Yoo'
  },
  {
    email: 'tokens.TimEst@example.com',
    uacct: nanoid(12),
    displayName: 'T Est',
    plaintextPassword: 'A not so very Bad password for Tim'
  },
  {
    email: 'tokens.mdma@example.com',
    uacct: nanoid(12),
    displayName: 'Molly',
    plaintextPassword: 'A not so very Bad password for Molly'
  }
]

// problem
// sig assumes server-side can impute the plaintext password
// it can not
// so instead of sending an hmac sig
// consider sending a p: base64(plainTextPassword)
//

beforeAll(async () => {
  // load table data
  await appTable.batchWrite(
    await Promise.all(
      userList.map(async u => {
        const { email, plaintextPassword, ...usr } = u
        return user.ent.putBatch({
          ...usr,
          pwHash: await user.password.toHash(plaintextPassword)
        })
      })
    ))// end user batch

  await Promise.all(userList.map(
    async u => user.addExternalID(u.uacct, 'email', u.email)
  ))
})

afterAll(async () => {
  // remove table data
  // so as to not interfere with other test-suites
  await appTable.batchWrite(
    userList.map(u => user.ent.deleteBatch(u))
  )
  await appTable.batchWrite(
    userList.map(u => userLookup.ent.deleteBatch({ exID: u.email, typeID: 'email' }))
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

  const tokEvt = event()
  tokEvt.requestContext.http.protocol = 'https'
  tokEvt.requestContext.http.method = 'POST'
  tokEvt.requestContext.http.path = '/tokens'

  test('Make a starter token for YOOSir - the starter + OOB gives you a valid token', async () => {
    const user = userList[0]
    const e = { ...tokEvt }
    e.headers = {
      email: encodeURIComponent(user.email),
      p: atob(user.plaintextPassword)
    }
    const resp = await handler(e, ctx)
    console.log({ resp })
    expect(resp).toEqual({})
  })
})

describe.skip('GET /tokens', () => {
  const tokEvt = event()
  tokEvt.requestContext.http.protocol = 'https'
  tokEvt.requestContext.http.method = 'GET'
  tokEvt.requestContext.http.path = '/tokens'

  beforeEach(async () => {})
  afterEach(async () => {})

  test.skip('Get tokens available for Yoo', async () => {

  })
})

describe.skip('PUT /tokens', () => {
  const tokEvt = event()
  tokEvt.requestContext.http.protocol = 'https'
  tokEvt.requestContext.http.method = 'PUT'
  tokEvt.requestContext.http.path = '/tokens'

  beforeEach(async () => {})
  afterEach(async () => {})
  test('Refresh token for Yoo', async () => {})
})

describe.skip('DELETE /tokens', () => {
  const tokEvt = event()
  tokEvt.requestContext.http.protocol = 'https'
  tokEvt.requestContext.http.method = 'DELETE'
  tokEvt.requestContext.http.path = '/tokens'

  beforeEach(async () => {})
  afterEach(async () => {})
  test.skip('Remove a token for Yoo', async () => {})
})
