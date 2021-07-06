/* globals describe test expect beforeEach afterEach beforeAll afterAll */
import type { SRet, Evt } from '../../src/types'

import handler from '../../src/funcs/links'
import { event, ctx } from '../gatewayData'
import { jwtSign } from '../../src/auths/validJWT'
import { nanoid } from 'nanoid'
import { appTable, user, link, userLookup } from '../../src/entities'

const URIencodeJSONStrVals = function(_:any,value:unknown){
  type Element = string | {short?:string, long:string}
  type Val = Element | Element[]
  const val = value as Val
  
  if(typeof val ==='string'){
    // base case
    return encodeURIComponent(val)
  }else{
    //could be string[] or {long, short}
    // both cause the function to recurse
    // punt till we get to the base case
    return val
  }
}

const JSONStringerWithURIEncode = (i:any)=>JSON.stringify(i, URIencodeJSONStrVals)

const JSONParse = (input:any)=>{
  try{
    return {er:null, data: JSON.parse(input)}
  }catch(er){
    return {er, data:null}
  }
}

const preLoadUsers = [
  {
    email: 'links.user1@example.com',
    uacct: nanoid(12),
    displayName: 'Yoo Sir',
    plaintextPassword: 'A not so very Bad password for Yoo'
  },
  {
    email: 'links.TimEst@example.com',
    uacct: nanoid(12),
    displayName: 'T Est',
    plaintextPassword: 'A not so very Bad password for Tim'
  },
  {
    email: 'links.mdma@example.com',
    uacct: nanoid(12),
    displayName: 'Molly',
    plaintextPassword: 'A not so very Bad password for Molly'
  }
]

export const preLoadLinks = [
  { short:'ex', 
    long:'https://example.com',
    ownerUacct: preLoadUsers[0].uacct
  },
  { short:'im', 
    long:'https://im.ericdmoore.com',
    ownerUacct: preLoadUsers[0].uacct
  },
  { short:'me',
    long:'https://ericdmoore.com',
    ownerUacct: preLoadUsers[1].uacct
  },
]

beforeAll(async () => {
  // setup links
  await appTable.batchWrite(preLoadLinks.map(l => link.ent.putBatch(l)))
  
  // setup users
  await appTable.batchWrite(
    await Promise.all(
      preLoadUsers.map(async u => {
        const { email, plaintextPassword, ...usr } = u
        return user.ent.putBatch({
          ...usr,
          email: u.email,
          pwHash: await user.password.toHash(plaintextPassword),
          backupCodes: await user.otp.genBackups(),
          oobTokens: [await user.otp.gen2FA(u.uacct, 'TOTP', 'initial TOTP')]
        })
      })
    ))// end user batch

  // setup external lookups
  await Promise.all([
    ...preLoadUsers.map(
      async u => user.addExternalID(u.uacct, 'email', u.email)
    )
  ])
})

afterAll(async () => {
  // tear down links
  await appTable.batchWrite(preLoadLinks.map(l => link.ent.deleteBatch(l)))

  // tear down users
  await appTable.batchWrite(
    preLoadUsers.map(u => user.ent.deleteBatch(u))
  )

  // tear down userLookups
  await appTable.batchWrite(
    preLoadUsers.map(u => userLookup.ent.deleteBatch({ exID: u.email, typeID: 'email' }))
  )

})

describe.only('POST /links', () => {
  const postLinkEvt = event('POST', '/links')
  
  test.only('Most Basic POST', async () => {
    // Remember: H > Q > C
    // 
    const e:Evt = {
      ...postLinkEvt,
      headers:{
        token : await jwtSign()({uacct:nanoid(), email:'eric.d.moore@gmail.com', last25:[]}),
        paths : JSONStringerWithURIEncode([
          'https://im.ericdmoore.com/path1',
          'https://im.ericdmoore.com/path2',
          {
            short: 'p1',
            long: 'https://im.ericdmoore.com/path1',
          },
          {
            long: 'https://im.ericdmoore.com/path2'
          }
        ])
      }
    }

    const resp = await handler(e, ctx) as SRet
    const {er, data} = JSONParse(resp?.body ?? '{}')
    const body = data
    expect(er).toBeFalsy()
    expect(resp).toHaveProperty('statusCode',200)
    expect(resp).toHaveProperty('isBase64Encoded',false)
    expect(resp).toHaveProperty('body')
    expect(body).toBeTruthy()
})
  
  test.skip('POST Lacks Auth fails with a 400', async()=>{
    const e = {
      ...postLinkEvt,
      headers:{
        path : encodeURIComponent('https://im.ericdmoore.com')
      }
    }
  
    const resp = await handler(e, ctx) as SRet
    const body = JSON.parse(resp?.body ?? '{}')
  
    expect(resp).toHaveProperty('statusCode',400)
    expect(resp).toHaveProperty('isBase64Encoded',false)
    expect(body).toHaveProperty('errors')
  })
  test.skip('Authd POST requests vainity shorturl')
  test.skip('Authd POST using a batch')
})

describe.skip('GET /links', () => {
  test.skip('Grab a list of pre-defiend link paths')
  test.skip('Grab the latest batch of links for this user')
})

describe.skip('PUT /links', () => {
  test.skip('Change Link to be Dynmamic - Rotate')
  test.skip('Change Link to be Dynmamic - Nested Config')
})

describe.skip('DELETE /links', () => {
  test.skip('Delete the short link')
})