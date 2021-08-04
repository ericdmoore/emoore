import handler from '../../src/funcs/expand'
import {nanoid} from 'nanoid'
import {link, user, appTable, userAccess} from '../../src/entities'
import type {BatchCreateElem}from '../../src/entities'
import {event, ctx, RequestContext} from '../gatewayData'


const JSONParse = (input:string)=>{
    try{ return {er:null, data: JSON.parse(input) as unknown} }
    catch(er){ return {er, data:null}}
}

describe('Expand Link Data Setup',()=>{
    const ipAddrs = [
        '75.8.99.75',// US/Dallas,TX
        '216.131.114.245' // DE/Frankfurt
    ]

    const preLoadedUsers = [{
        email: 'expanding.Eric@example.com', 
        uacct: nanoid(12),
        displayName: 'Ever Expanding Eric', 
        plaintextPassword: 'password For Expanding Eric', 
    }]

    const linkDefs:BatchCreateElem[] = [{
        short: nanoid(5),
        long:'https://ericdmoore.com/1',
        ownerUacct: preLoadedUsers[0].uacct
    },{
        short: nanoid(5),
        long:'https://ericdmoore.com/2',
        ownerUacct: preLoadedUsers[0].uacct
    }]

    beforeAll(async ()=>{
        // setup users
        await link.batch.put(...linkDefs)
        await user.batch.put(...preLoadedUsers)

    })
    afterAll(async ()=>{
        await appTable.batchWrite(preLoadedUsers.map(u => user.ent.deleteBatch(u)))
        await appTable.batchWrite(preLoadedUsers.map(l => userAccess.ent.deleteBatch(l)))
        await appTable.batchWrite(linkDefs.map(l => link.ent.deleteBatch(l))) 
    })
    
    test('Basic Expansion /1', async ()=>{
        const e = event('GET',
            '/expand/', 
            { http: { sourceIp:ipAddrs[0] } },
            { short: linkDefs[0].short }
        )

        const resp = await handler(e,ctx)

        expect(resp).toHaveProperty('statusCode', 307)
        expect(resp).toHaveProperty('isBase64Encoded',false)
        expect(resp).toHaveProperty('headers')
        expect(resp.headers).toHaveProperty('Location')
        expect(resp.headers?.Location).toEqual('https://ericdmoore.com/1')
    })

    test('Basic Expansion /2', async ()=>{
        const e = event('GET', '/expand/', 
            { http: { sourceIp:ipAddrs[0] } },
            { short: linkDefs[1].short }
        )

        const resp = await handler(e,ctx)

        expect(resp).toHaveProperty('headers')
        expect(resp).toHaveProperty('statusCode', 307)
        expect(resp).toHaveProperty('isBase64Encoded',false)
        expect(resp.headers).toHaveProperty('Location')
        expect(resp.headers?.Location).toEqual('https://ericdmoore.com/2')
    })
})