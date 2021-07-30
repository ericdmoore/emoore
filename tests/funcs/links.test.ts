/* globals describe test expect beforeEach afterEach beforeAll afterAll */
import type { SRet, Evt } from '../../src/types'

import handler from '../../src/funcs/links'
import { event, ctx } from '../gatewayData'
import { jwtSign } from '../../src/auths/validJWT'
import { nanoid } from 'nanoid'
import { appTable, user, link, userLookup, ILink, userAccess } from '../../src/entities'
import type {MetaResp} from '../../src/types'

const {rotates, expires} = link.dynamicConfig

interface ListPostResp extends MetaResp {
  links: ILink[]
}

const URIencodeJSONStrVals = function(_:any,v:(string | {short?:string, long:string})[]){
  return typeof v ==='string'
    ? encodeURIComponent(v)
    : v
}

const JSONStringerWithURIEncode = (i:any)=>JSON.stringify(i, URIencodeJSONStrVals)

const JSONParse = (input:string)=>{
  try{ return {er:null, data: JSON.parse(input) as unknown} }
  catch(er){ return {er, data:null}}
}

const preLoadUsers = [
  {
    email: 'links.user1@example.com',
    uacct: nanoid(12),
    displayName: 'ItzaMe EricMario',
    plaintextPassword: 'A not so very Bad password for Yoo'
  },
  {
    email: 'links.TimEst@example.com',
    uacct: nanoid(12),
    displayName: 'T.Est',
    plaintextPassword: 'A not so very Bad password for Tim'
  },
  {
    email: 'links.mdma@example.com',
    uacct: nanoid(12),
    displayName: 'Molly',
    plaintextPassword: 'A not so very Bad password for Molly'
  }
]

// Declaring 
const userEric3Links = preLoadUsers[0]
const userDeletesStuff = preLoadUsers[1]
const userMolly1Link = preLoadUsers[2]

export const lanks = (() => Promise.all([
  link.create({
    short:'ex', 
    long:'https://example.com',
    ownerUacct: userEric3Links.uacct
  }),
  link.create({ 
    short:'im', 
    long:'https://im.ericdmoore.com',
    ownerUacct: userEric3Links.uacct
  }),
  link.create({
    short:'changer', 
    long:'https://im.ericdmoore.com',
    ownerUacct: userEric3Links.uacct,
    dynamicConfig: expires([
      {url:'http://example1.1com', at:1234},
      {url:'http://example2.1com', at:1234},
    ])
  }),
  link.create({ 
    short:'me',
    long:'https://ericdmoore.com',
    ownerUacct: userMolly1Link.uacct
  }),
  link.create({ 
    short:'deleteMe1',
    long:'https://ericdmoore.com',
    ownerUacct: userDeletesStuff.uacct
  }),
  link.create({ 
    short:'deleteMe2',
    long:'https://ericdmoore.com',
    ownerUacct: userDeletesStuff.uacct
  }),
  link.create({ 
    short:'deleteMe3',
    long:'https://ericdmoore.com',
    ownerUacct: userDeletesStuff.uacct
  }),
]))()

beforeAll(async () => {
  // setup links
  const links = await lanks

  await user.batch.put(...preLoadUsers)
  await link.batch.put(...links)
  await userAccess.batch.put(...links)

})

afterAll(async () => {
  const links = await lanks
  // tear down links
  await appTable.batchWrite(links.map(l => link.ent.deleteBatch(l)))

  // tear down users
  await appTable.batchWrite(
    preLoadUsers.map(u => user.ent.deleteBatch(u))
  )
  // tear down userLookups
  await appTable.batchWrite(
    preLoadUsers.map(u => userLookup.ent.deleteBatch({ exID: u.email, typeID: 'email' }))
  )
  // tear down userAccess
  await appTable.batchWrite(
    links.map(l => userAccess.ent.deleteBatch({short: l.short, uacct: l.ownerUacct}))
  )
})

describe('POST /links', () => {
  const evt = event('POST', '/links')
  
  test('Most KitchenSink POST', async () => {
    // Remember: H > Q > C
    // 
    const e:Evt = {
      ...evt,
      headers:{
        token : await jwtSign()({ uacct:nanoid(), maxl25:[], email:'eric.d.moore@gmail.com' }),
        longpaths : JSONStringerWithURIEncode([
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
    const {er, data} = JSONParse(resp?.body ?? '{}')
    const body = data as ListPostResp
    
    // console.log(body)

    expect(er).toBeFalsy()
    expect(resp).toHaveProperty('statusCode',200)
    expect(resp).toHaveProperty('isBase64Encoded',false)
    expect(resp).toHaveProperty('body')
    
    expect(body).toHaveProperty('links')
    expect(body.links).toHaveLength(4)
})
  
  test('POST Lacks Auth fails with a 400', async()=>{
    const e = {
      ...evt,
      headers:{
        longpaths : encodeURIComponent('https://im.ericdmoore.com')
      }
    }
  
    const resp = await handler(e, ctx) as SRet
    const body = JSON.parse(resp?.body ?? '{}')
  
    expect(resp).toHaveProperty('statusCode',400)
    expect(resp).toHaveProperty('isBase64Encoded',false)
    expect(body).toHaveProperty('errors')
  })

  test('Authd POST requests vainity shorturl', async ()=>{
    // Remember: H > Q > C
    // 
    const e:Evt = {
      ...evt,
      headers:{
        token : await jwtSign()({ uacct:nanoid(), maxl25:[], email:'eric.d.moore@gmail.com' }),
        longpaths : JSONStringerWithURIEncode([
          { short: 'newVanity',
            long: 'https://im.ericdmoore.com/path1'}
        ])
      }
    }

    const resp = await handler(e, ctx) as SRet
    const {er, data} = JSONParse(resp?.body ?? '{}')
    const body = data as ListPostResp
    
    // console.log(body)

    expect(er).toBeFalsy()
    expect(resp).toHaveProperty('statusCode',200)
    expect(resp).toHaveProperty('isBase64Encoded',false)
    expect(resp).toHaveProperty('body')
    
    expect(body).toHaveProperty('links')
    expect(body.links).toHaveLength(1)
  })

  test('Authd POST batch too big',async ()=>{
    // Remember: H > Q > C
    // 
    const e:Evt = {
      ...evt,
      headers:{
        token : await jwtSign()({ uacct:nanoid(), maxl25:[], email:'eric.d.moore@gmail.com' }),
        longpaths : JSONStringerWithURIEncode([
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
    const {er, data} = JSONParse(resp?.body ?? '{}')
    const body = data as ListPostResp
    
    // console.log(body)

    expect(er).toBeFalsy()
    expect(resp).toHaveProperty('statusCode',400)
    expect(resp).toHaveProperty('isBase64Encoded',false)
    expect(body).toHaveProperty('errors')
  })
})

describe('GET /links', () => {
  const evt = event('GET', '/links')

  test('Grab a list of pre-defiend link paths', async ()=>{
    const e:Evt = {
      ...evt,
      headers:{
        // token : await jwtSign()({ uacct:nanoid(), maxl25:[], email:'eric.d.moore@gmail.com' }),
        shortpaths : JSONStringerWithURIEncode([ 
          'ex', 
          'me', { short: 'im' }
        ])
      }
    }

    const resp = await handler(e, ctx) as SRet
    const {er, data} = JSONParse(resp?.body ?? '{}')
    const body = data as ListPostResp
    
    expect(er).toBeFalsy()
    expect(resp).toHaveProperty('statusCode',200)
    expect(resp).toHaveProperty('isBase64Encoded',false)
    expect(resp).toHaveProperty('body')
    expect(body).toHaveProperty('links')
    expect(body.links).toHaveLength(3)

  })

  test('Latest link batch for User:Eric based on token data', async()=>{
    const e:Evt = {
      ...evt,
      headers:{
        token : await jwtSign()({ 
          uacct: userEric3Links.uacct, 
          maxl25:[], 
          email:'eric.d.moore@gmail.com' }),
      }
    }

    const resp = await handler(e, ctx) as SRet
    const {er, data} = JSONParse(resp?.body ?? '{}')
    const body = data as ListPostResp

    expect(er).toBeFalsy()
    expect(resp).toHaveProperty('statusCode',200)
    expect(resp).toHaveProperty('isBase64Encoded',false)
    expect(resp).toHaveProperty('body')
    expect(body).toHaveProperty('links')
    expect(body.links).toHaveLength(3)
  })

  test('Latest link batch for User:Molly based on token data', async()=>{
    const e:Evt = {
      ...evt,
      headers:{
        token : await jwtSign()({ 
          uacct: userMolly1Link.uacct, 
          maxl25:[], 
          email:'doesNotMatterForThisTest' }),
      }
    }

    const resp = await handler(e, ctx) as SRet
    const {er, data} = JSONParse(resp?.body ?? '{}')
    const body = data as ListPostResp

    // console.log(0, resp)
    // console.log(1, body)

    expect(er).toBeFalsy()
    expect(resp).toHaveProperty('statusCode',200)
    expect(resp).toHaveProperty('isBase64Encoded',false)
    expect(resp).toHaveProperty('body')
    expect(body).toHaveProperty('links')
    expect(body.links).toHaveLength(1)
  })

})

describe('PUT /links', () => {
  const evt = event('PUT', '/links')

  test('Change 2 Links to be Dynmamic', async ()=>{
    const e:Evt = {
      ...evt,
      headers:{
        update: JSON.stringify(
          {
            ex: {
              long:'http://example0.1com', 
              metatags: {'og:title':'New Title1'},
              tags:{newTag:'1'},
              params:{newParam:'1'},
              dynamicConfig: rotates([
                {at:2, url:'http://example1.1com'},
                {at:4, url:'http://example2.1com'}
              ])
            },
            im:{
              long:'http://example0.1com', 
              metatags: {'og:title':'New Title2'},
              tags:{newTag:'2'},
              params:{newParam:'2'},
              dynamicConfig: expires([
                {url:'http://example1.1com', at:1234},
                {url:'http://example2.1com', at:1234},
              ])
            }
          }
        ),
        token : await jwtSign()({ 
          uacct: userEric3Links.uacct, 
          maxl25:[], 
          email:'doesNotMatterForThisTest' }),
      }
    }

    const resp = await handler(e, ctx) as SRet
    const {er, data} = JSONParse(resp?.body ?? '{}')
    const body = data as ListPostResp

    // console.log(0, resp)
    // console.log(1, body)

    expect(er).toBeFalsy()
    expect(resp).toHaveProperty('statusCode',200)
    expect(resp).toHaveProperty('isBase64Encoded',false)
    expect(resp).toHaveProperty('body')
    expect(body).toHaveProperty('links')
    expect(body.links).toHaveLength(2)
  })

  test('Change 1 Link to be Dynmamic/ Very Nested Config', async ()=>{
    const e:Evt = {
      ...evt,
      headers:{
        token : await jwtSign()({ 
          uacct: userMolly1Link.uacct, 
          maxl25:[], 
          email:'doesNotMatterForThisTest' 
        }),
        update: JSON.stringify({
          ex: {
            long:'http://example0.1com', 
            metatags: {'og:title':'New Title1'},
            tags:{newTag:'1'},
            params:{newParam:'1'},
            dynamicConfig:rotates([
              {at:2, url:'http://example1.1com'},
              {at:4, url: expires([
                {url:'http://example1.1com', at:1234},
                {url:'http://example2.1com', at:1234},
              ])}
            ])
          }
        }),
      }
    }

    const resp = await handler(e, ctx) as SRet
    const {er, data} = JSONParse(resp?.body ?? '{}')
    const body = data as ListPostResp

    // console.log(0, resp)
    // console.log(1, body)

    expect(er).toBeFalsy()
    expect(resp).toHaveProperty('statusCode',200)
    expect(resp).toHaveProperty('isBase64Encoded',false)
    expect(resp).toHaveProperty('body')
    expect(body).toHaveProperty('links')
    expect(body.links).toHaveLength(1)
  })

  test('Change a Dynamic Link to be static', async ()=>{  
    const e:Evt = {
      ...evt,
      headers:{
        token : await jwtSign()({ 
          uacct: userMolly1Link.uacct, 
          maxl25:[], 
          email:'doesNotMatterForThisTest' 
        }),
        update: JSON.stringify({
          changer: {
            long:'http://example0.1com', 
            metatags: {'og:title':'New Title1'},
            tags:{newTag:'1'},
            params:{newParam:'1'}
          },
        }),
      }
    }

    const resp = await handler(e, ctx) as SRet
    const {er, data} = JSONParse(resp?.body ?? '{}')
    const body = data as ListPostResp

    // console.log(0, resp)
    // console.log(1, body)

    expect(er).toBeFalsy()
    expect(resp).toHaveProperty('statusCode',200)
    expect(resp).toHaveProperty('isBase64Encoded',false)
    expect(resp).toHaveProperty('body')
    expect(body).toHaveProperty('links')
    expect(body.links).toHaveLength(1)
  })
})

describe('DELETE /links', () => {
  const evt = event('DELETE', '/links')

  test('Delete a short link', async () => {
    const token  = await jwtSign()({ 
      uacct: userDeletesStuff.uacct, 
      maxl25:[], 
      email:'doesNotMatterForThisTest' 
    })
    const e:Evt = {
      ...evt,
      headers:{
        token, 
        del: JSON.stringify(['deleteMe1'])
      }
    }

    const resp = await handler(e, ctx) as SRet
    const {er, data} = JSONParse(resp?.body ?? '{}')
    const body = data as {deleted: string[]}

    expect(er).toBeFalsy()
    expect(resp).toHaveProperty('statusCode',200)
    expect(resp).toHaveProperty('isBase64Encoded',false)
    expect(resp).toHaveProperty('body')
    expect(body).toHaveProperty('deleted')
    expect(body.deleted).toHaveLength(1)

  })

  test('Delete a short link batch', async()=>{
    const token  = await jwtSign()({ 
      uacct: userDeletesStuff.uacct, 
      maxl25:[], 
      email:'doesNotMatterForThisTest' 
    })
    const e:Evt = {
      ...evt,
      headers:{
        token, 
        del: JSON.stringify(['deleteMe2', 'deleteMe3'])
      }
    }

    const resp = await handler(e, ctx) as SRet
    const {er, data} = JSONParse(resp?.body ?? '{}')
    const body = data as {deleted: string[]}
    
    // console.log(body)

    expect(er).toBeFalsy()
    expect(resp).toHaveProperty('statusCode',200)
    expect(resp).toHaveProperty('isBase64Encoded',false)
    expect(resp).toHaveProperty('body')
    expect(body).toHaveProperty('deleted')
    expect(body.deleted).toHaveLength(2)

  })

  test('Can not delete invalid short links', async () => {
    const token  = await jwtSign()({ 
      uacct: userDeletesStuff.uacct, 
      maxl25:[], 
      email:'doesNotMatterForThisTest' 
    })
    const e:Evt = {
      ...evt,
      headers:{
        token, 
        del: JSON.stringify(['lamb1'])
      }
    }

    const resp = await handler(e, ctx) as SRet
    const {er, data} = JSONParse(resp?.body ?? '{}')
    const body = data as any

    expect(er).toBeFalsy()
    expect(resp).toHaveProperty('statusCode',400)
    expect(resp).toHaveProperty('isBase64Encoded',false)
    expect(resp).toHaveProperty('body')
    expect(body).toHaveProperty('errors')

  })

  test('Can not delete more than 25 short links', async () => {
    const token  = await jwtSign()({ 
      uacct: userDeletesStuff.uacct, 
      maxl25:[], 
      email:'doesNotMatterForThisTest' 
    })
    const e:Evt = {
      ...evt,
      headers:{
        token, 
        del: JSON.stringify([
          'l1','l2','l3','l4','l5','l6',
          'l7','l8','l9','l10','l11','l12',
          'l13','l14','l15','l16','l17','l18',
          'l19','l20','l21','l22','l23','l24',
          'l25','l26'
        ])
      }
    }

    const resp = await handler(e, ctx) as SRet
    const {er, data} = JSONParse(resp?.body ?? '{}')
    const body = data as any

    expect(er).toBeFalsy()
    expect(resp).toHaveProperty('statusCode',400)
    expect(resp).toHaveProperty('isBase64Encoded',false)
    expect(resp).toHaveProperty('body')
    expect(body).toHaveProperty('errors')

  })

  test('Error for deleting un-owned links ', async () => {
    const token  = await jwtSign()({ 
      uacct: userMolly1Link.uacct, 
      maxl25:[], 
      email:'doesNotMatterForThisTest' 
    })
    const e:Evt = {
      ...evt,
      headers:{
        token, 
        del: JSON.stringify(['im'])
      }
    }

    const resp = await handler(e, ctx) as SRet
    const {er, data} = JSONParse(resp?.body ?? '{}')
    const body = data

    expect(er).toBeFalsy()
    expect(resp).toHaveProperty('statusCode',400)
    expect(resp).toHaveProperty('isBase64Encoded',false)
    expect(resp).toHaveProperty('body')
    expect(body).toHaveProperty('errors')
  })

})