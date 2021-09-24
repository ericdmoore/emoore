/* globals describe test expect  beforeAll afterAll */
// beforeEach afterEach
import type { SRet, Evt, MetaResp } from '../../server/types'

import { nanoid } from 'nanoid'

import { event, ctx } from '../gatewayData'
import handler from '../../server/funcs/links'
import { accessToken } from '../../server/auths/tokens'
import { appTable, user, link, userLookup, ILink, userAccess } from '../../server/entities'
import { JSONparse as JSONParse } from '../../server/utils/jsonParse'

const { rotates, expires } = link.dynamicConfig

interface ListPostResp extends MetaResp {
  links: ILink[]
}

const URIencodeJSONStrVals = function (_:any, v:(string | {short?:string, long:string})[]) {
  return typeof v === 'string'
    ? encodeURIComponent(v)
    : v
}

const JSONStringerWithURIEncode = (i:any) => JSON.stringify(i, URIencodeJSONStrVals)

const preLoadUsers = [
  { // 0
    email: 'links.user1@example.com',
    uacct: nanoid(12),
    displayName: 'ItzaMe EricMario',
    passwordPlainText: 'A not so very Bad password for Yoo'
  },
  { // 1
    email: 'links.TimEst@example.com',
    uacct: nanoid(12),
    displayName: 'T.Est',
    passwordPlainText: 'A not so very Bad password for Tim'
  },
  { // 2
    email: 'links.mdma@example.com',
    uacct: nanoid(12),
    displayName: 'Molly',
    passwordPlainText: 'A not so very Bad password for Molly'
  },
  { // 3
    email: 'links.user2@example.com',
    uacct: nanoid(12),
    displayName: 'Bono of User2',
    passwordPlainText: 'A not so very Bad password for Bono'
  }
]

// Declaring
const userEric3Links = preLoadUsers[0]
const userDeletesStuff = preLoadUsers[1]
const userMolly1Link = preLoadUsers[2]

const linkDefs = [
  {
    short: 'ex',
    long: 'https://example.com',
    ownerUacct: userEric3Links.uacct
  },
  {
    short: 'im',
    long: 'https://im.ericdmoore.com',
    ownerUacct: userEric3Links.uacct
  },
  {
    short: 'changer',
    long: 'https://im.ericdmoore.com',
    ownerUacct: userEric3Links.uacct,
    dynamicConfig: expires([
      { url: 'http://example1.1com', at: 1234 },
      { url: 'http://example2.1com', at: 1234 }
    ])
  },
  {
    short: 'me',
    long: 'https://ericdmoore.com',
    ownerUacct: userMolly1Link.uacct
  },
  {
    short: 'deleteMe1',
    long: 'https://ericdmoore.com',
    ownerUacct: userDeletesStuff.uacct
  },
  {
    short: 'deleteMe2',
    long: 'https://ericdmoore.com',
    ownerUacct: userDeletesStuff.uacct
  },
  {
    short: 'deleteMe3',
    long: 'https://ericdmoore.com',
    ownerUacct: userDeletesStuff.uacct
  }
]

beforeAll(async () => {
  // setup links
  const links = await link.batch.put(...linkDefs)
  await user.batch.put(...preLoadUsers)
  // await link.batch.put(...links)
  await userAccess.batch.put(...links)
})

afterAll(async () => {
  // const links = await lanks
  // tear down links + users
  await link.batch.rm(...linkDefs)
  await user.batch.rm(...preLoadUsers)

  // tear down userLookups
  await appTable.batchWrite(
    preLoadUsers.map(u => userLookup.ent.deleteBatch({ exID: u.email, typeID: 'email' }))
  )

  // tear down userAccess
  await appTable.batchWrite(
    linkDefs.map(l => userAccess.ent.deleteBatch({ short: l.short, uacct: l.ownerUacct }))
  )
})

describe('POST /links', () => {
  const evt = event('POST', '/links')

  test('Most KitchenSink POST', async () => {
    // Remember: H > Q > C
    //
    const user = preLoadUsers[3] // Bono
    const { email, uacct } = user
    const { token } = await accessToken().create({ email, uacct, last25: [] })
    const e:Evt = {
      ...evt,
      headers: {
        token,
        longpaths: JSONStringerWithURIEncode([
          'https://im.ericdmoore.com/path1',
          'https://im.ericdmoore.com/path2',
          {
            short: 'ex2',
            long: 'https://example.com'
          },
          {
            long: 'https://example2.com'
          }
        ])
      }
    }

    const resp = await handler(e, ctx) as SRet
    const { err, data } = JSONParse(resp?.body ?? '{}')
    const body = data as ListPostResp

    // console.log({ resp, body })

    expect(err).toBeFalsy()
    expect(resp).toHaveProperty('statusCode', 200)
    expect(resp).toHaveProperty('isBase64Encoded', false)
    expect(resp).toHaveProperty('body')

    expect(body).toHaveProperty('links')
    expect(body.links).toHaveLength(4)
  })

  test('POST Lacks Auth fails with a 400', async () => {
    const e = {
      ...evt,
      headers: {
        longpaths: encodeURIComponent('https://im.ericdmoore.com')
      }
    }

    const resp = await handler(e, ctx) as SRet
    const body = JSON.parse(resp?.body ?? '{}')

    expect(resp).toHaveProperty('statusCode', 400)
    expect(resp).toHaveProperty('isBase64Encoded', false)
    expect(body).toHaveProperty('errors')
  })

  test('Authd POST requests vainity shorturl', async () => {
    // Remember: H > Q > C
    //
    const user = preLoadUsers[0]
    const { email, uacct } = user
    const { token } = await accessToken().create({ email, uacct, last25: [] })

    const e:Evt = {
      ...evt,
      headers: {
        token,
        longpaths: JSONStringerWithURIEncode([
          {
            short: 'newVanity',
            long: 'https://im.ericdmoore.com/path1'
          }
        ])
      }
    }

    const resp = await handler(e, ctx) as SRet
    const { err, data } = JSONParse(resp?.body ?? 'null')
    const body = data as ListPostResp

    // console.log(body)

    expect(err).toBeFalsy()
    expect(resp).toHaveProperty('statusCode', 200)
    expect(resp).toHaveProperty('isBase64Encoded', false)
    expect(resp).toHaveProperty('body')

    expect(body).toHaveProperty('links')
    expect(body.links).toHaveLength(1)
  })

  test('Authd POST batch too big', async () => {
    // Remember: H > Q > C
    //

    const user = preLoadUsers[0]
    const { email, uacct } = user
    const { token } = await accessToken().create({ email, uacct, last25: [] })

    const e:Evt = {
      ...evt,
      headers: {
        token,
        longpaths: JSONStringerWithURIEncode([
          'https://t.co/p1',
          'https://t.co/p2',
          'https://t.co/p3',
          'https://t.co/p4',
          'https://t.co/p5',
          'https://t.co/p6',
          'https://t.co/p7',
          'https://t.co/p8',
          'https://t.co/p9',
          'https://t.co/p10',
          'https://t.co/p11',
          'https://t.co/p12',
          'https://t.co/p13',
          'https://t.co/p14',
          'https://t.co/p15',
          'https://t.co/p16',
          'https://t.co/p17',
          'https://t.co/p18',
          'https://t.co/p19',
          'https://t.co/p20',
          'https://t.co/p21',
          'https://t.co/p22',
          'https://t.co/p23',
          'https://t.co/p24',
          'https://t.co/p25',
          'https://t.co/p26'
        ])
      }
    }

    const resp = await handler(e, ctx) as SRet
    const { err, data } = JSONParse(resp?.body ?? '{}')
    const body = data as ListPostResp

    // console.log(body)

    expect(err).toBeFalsy()
    expect(resp).toHaveProperty('statusCode', 400)
    expect(resp).toHaveProperty('isBase64Encoded', false)
    expect(body).toHaveProperty('errors')
  })
})

describe('GET /links', () => {
  const evt = event('GET', '/links')
  test('Grab a list of pre-defiend link paths', async () => {
    const e:Evt = {
      ...evt,
      headers: { shortpaths: JSONStringerWithURIEncode(['ex', 'me', { short: 'im' }]) }
    }

    const resp = await handler(e, ctx) as SRet
    const { err, data } = JSONParse(resp?.body ?? '{}')
    const body = data as ListPostResp

    expect(err).toBeFalsy()
    expect(resp).toHaveProperty('statusCode', 200)
    expect(resp).toHaveProperty('isBase64Encoded', false)
    expect(resp).toHaveProperty('body')
    expect(body).toHaveProperty('links')
    expect(body.links).toHaveLength(3)
  })

  test('Latest link batch for User:Eric based on token data', async () => {
    const user = preLoadUsers[0]
    const { email, uacct } = user
    const { token } = await accessToken().create({ email, uacct, last25: [] })

    const e:Evt = { ...evt, headers: { authToken: token } }

    const resp = await handler(e, ctx) as SRet
    const { err, data } = JSONParse(resp?.body ?? '{}')
    const body = data as ListPostResp

    expect(err).toBeFalsy()
    expect(resp).toHaveProperty('statusCode', 200)
    expect(resp).toHaveProperty('isBase64Encoded', false)
    expect(resp).toHaveProperty('body')
    expect(body).toHaveProperty('links')
    expect(body.links).toHaveLength(3)
  })

  test('Latest link batch for User:Molly based on token data', async () => {
    const user = userMolly1Link
    const { email, uacct } = user
    const { token } = await accessToken().create({ email, uacct, last25: [] })
    const e:Evt = { ...evt, headers: { authToken: token } }
    // console.log(e, email, uacct)
    const resp = await handler(e, ctx) as SRet
    const { err, data } = JSONParse(resp?.body ?? '{}')
    const body = data as ListPostResp

    // console.log(0, resp)
    // console.log(1, body)

    expect(err).toBeFalsy()
    expect(resp).toHaveProperty('statusCode', 200)
    expect(resp).toHaveProperty('isBase64Encoded', false)
    expect(resp).toHaveProperty('body')
    expect(body).toHaveProperty('links')
    expect(body.links).toHaveLength(1)
  })
})

describe('PUT /links', () => {
  const evt = event('PUT', '/links')

  test('Change 2 Links to be Dynmamic', async () => {
    const e:Evt = {
      ...evt,
      headers: {
        update: JSON.stringify(
          {
            ex: {
              long: 'http://example0.1com',
              metatags: { 'og:title': 'New Title1' },
              tags: { newTag: '1' },
              params: { newParam: '1' },
              dynamicConfig: rotates([
                { at: 2, url: 'http://example1.1com' },
                { at: 4, url: 'http://example2.1com' }
              ])
            },
            im: {
              long: 'http://example0.1com',
              metatags: { 'og:title': 'New Title2' },
              tags: { newTag: '2' },
              params: { newParam: '2' },
              dynamicConfig: expires([
                { url: 'http://example1.1com', at: 1234 },
                { url: 'http://example2.1com', at: 1234 }
              ])
            }
          }
        ),
        token: (await accessToken()
          .create({
            uacct: userEric3Links.uacct,
            email: 'doesNotMatterForThisTest',
            last25: []
          })).token
      }
    }

    const resp = await handler(e, ctx) as SRet
    const { err, data } = JSONParse(resp?.body ?? '{}')
    const body = data as ListPostResp

    // console.log(0,resp)
    // console.log(1,body)

    expect(err).toBeFalsy()
    expect(resp).toHaveProperty('statusCode', 200)
    expect(resp).toHaveProperty('isBase64Encoded', false)
    expect(resp).toHaveProperty('body')
    expect(body).toHaveProperty('links')
    expect(body.links).toHaveLength(2)
  })

  test('Change 1 Link to be Dynmamic/ Very Nested Config', async () => {
    const e:Evt = {
      ...evt,
      headers: {
        token: (await accessToken().create({
          uacct: userMolly1Link.uacct,
          last25: [],
          email: 'doesNotMatterForThisTest'
        })).token,
        update: JSON.stringify({
          ex: {
            long: 'http://example0.1com',
            metatags: { 'og:title': 'New Title1' },
            tags: { newTag: '1' },
            params: { newParam: '1' },
            dynamicConfig: rotates([
              { at: 2, url: 'http://example1.1com' },
              {
                at: 4,
                url: expires([
                  { url: 'http://example1.1com', at: 1234 },
                  { url: 'http://example2.1com', at: 1234 }
                ])
              }
            ])
          }
        })
      }
    }

    const resp = await handler(e, ctx) as SRet
    const { err, data } = JSONParse(resp?.body ?? '{}')
    const body = data as ListPostResp

    // console.log(0, resp)
    // console.log(1, body)

    expect(err).toBeFalsy()
    expect(resp).toHaveProperty('statusCode', 200)
    expect(resp).toHaveProperty('isBase64Encoded', false)
    expect(resp).toHaveProperty('body')
    expect(body).toHaveProperty('links')
    expect(body.links).toHaveLength(1)
  })

  test('Change a Dynamic Link to be static', async () => {
    const e:Evt = {
      ...evt,
      headers: {
        token: (await accessToken().create({
          uacct: userMolly1Link.uacct,
          email: 'doesNotMatterForThisTest',
          last25: []
        })).token,
        update: JSON.stringify({
          changer: {
            long: 'http://example0.1com',
            metatags: { 'og:title': 'New Title1' },
            tags: { newTag: '1' },
            params: { newParam: '1' }
          }
        })
      }
    }

    const resp = await handler(e, ctx) as SRet
    const { err, data } = JSONParse(resp?.body ?? '{}')
    const body = data as ListPostResp

    // console.log(0, resp)
    // console.log(1, body)

    expect(err).toBeFalsy()
    expect(resp).toHaveProperty('statusCode', 200)
    expect(resp).toHaveProperty('isBase64Encoded', false)
    expect(resp).toHaveProperty('body')
    expect(body).toHaveProperty('links')
    expect(body.links).toHaveLength(1)
  })
})

describe('DELETE /links', () => {
  const evt = event('DELETE', '/links')

  test('Delete a short link', async () => {
    const { token } = (await accessToken().create({
      uacct: userDeletesStuff.uacct,
      email: 'doesNotMatterForThisTest',
      last25: []
    }))
    const e:Evt = {
      ...evt,
      headers: {
        authToken: token,
        del: JSON.stringify(['deleteMe1'])
      }
    }

    const resp = await handler(e, ctx) as SRet
    const { err, data } = JSONParse(resp?.body ?? '{}')
    const body = data as {deleted: string[]}

    expect(err).toBeFalsy()
    expect(resp).toHaveProperty('statusCode', 200)
    expect(resp).toHaveProperty('isBase64Encoded', false)
    expect(resp).toHaveProperty('body')
    expect(body).toHaveProperty('deleted')
    expect(body.deleted).toHaveLength(1)
  })

  test('Delete a short link batch', async () => {
    const { token } = await accessToken().create({
      uacct: userDeletesStuff.uacct,
      email: 'doesNotMatterForThisTest',
      last25: []
    })
    const e:Evt = {
      ...evt,
      headers: {
        authToken: token,
        del: JSON.stringify(['deleteMe2', 'deleteMe3'])
      }
    }

    const resp = await handler(e, ctx) as SRet
    const { err, data } = JSONParse(resp?.body ?? '{}')
    const body = data as {deleted: string[]}

    // console.log(body)

    expect(err).toBeFalsy()
    expect(resp).toHaveProperty('statusCode', 200)
    expect(resp).toHaveProperty('isBase64Encoded', false)
    expect(resp).toHaveProperty('body')
    expect(body).toHaveProperty('deleted')
    expect(body.deleted).toHaveLength(2)
  })

  test('Can not delete invalid short links', async () => {
    const { token } = await accessToken().create({
      uacct: userDeletesStuff.uacct,
      email: 'doesNotMatterForThisTest',
      last25: []
    })
    const e:Evt = {
      ...evt,
      headers: {
        authToken: token,
        del: JSON.stringify(['lamb1'])
      }
    }

    const resp = await handler(e, ctx) as SRet
    const { err, data } = JSONParse(resp?.body ?? '{}')
    const body = data as any

    expect(err).toBeFalsy()
    expect(resp).toHaveProperty('statusCode', 400)
    expect(resp).toHaveProperty('isBase64Encoded', false)
    expect(resp).toHaveProperty('body')
    expect(body).toHaveProperty('errors')
  })

  test('Can not delete more than 25 short links', async () => {
    const { token } = await accessToken().create({
      uacct: userDeletesStuff.uacct,
      email: 'doesNotMatterForThisTest',
      last25: []
    })
    const e:Evt = {
      ...evt,
      headers: {
        authToken: token,
        del: JSON.stringify([
          'l1', 'l2', 'l3', 'l4', 'l5', 'l6',
          'l7', 'l8', 'l9', 'l10', 'l11', 'l12',
          'l13', 'l14', 'l15', 'l16', 'l17', 'l18',
          'l19', 'l20', 'l21', 'l22', 'l23', 'l24',
          'l25', 'l26'
        ])
      }
    }

    const resp = await handler(e, ctx) as SRet
    const { err, data } = JSONParse(resp?.body ?? '{}')
    const body = data as any

    expect(err).toBeFalsy()
    expect(resp).toHaveProperty('statusCode', 400)
    expect(resp).toHaveProperty('isBase64Encoded', false)
    expect(resp).toHaveProperty('body')
    expect(body).toHaveProperty('errors')
  })

  test('Error for deleting un-owned links ', async () => {
    const { token } = await accessToken().create({
      uacct: userMolly1Link.uacct,
      email: 'doesNotMatterForThisTest',
      last25: []
    })
    const e:Evt = {
      ...evt,
      headers: {
        authToken: token,
        del: JSON.stringify(['im'])
      }
    }

    const resp = await handler(e, ctx) as SRet
    const { err, data } = JSONParse(resp?.body ?? '{}')
    const body = data

    expect(err).toBeFalsy()
    expect(resp).toHaveProperty('statusCode', 400)
    expect(resp).toHaveProperty('isBase64Encoded', false)
    expect(resp).toHaveProperty('body')
    expect(body).toHaveProperty('errors')
  })
})
