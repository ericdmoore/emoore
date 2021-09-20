import emc from '../client/index'
import dotenv from 'dotenv'
import {resolve} from 'path'
import {readFileSync} from 'fs'

const vars = dotenv.parse(readFileSync(resolve(__dirname, '../tools/user.env')).toString())

const baseURL = 'https://8wpbgn8oo4.execute-api.us-west-2.amazonaws.com'
const emoore = emc(baseURL)

beforeAll(async ()=>{
    // saves AuthToken into client
    await emoore.post.tokens({email:'ericdmoore', passphrase:vars.PASSWORD, TFA:'GET FROM AUTHY Before running'})
})

describe('/tokens',()=>{
    test('preTest Init worked', ()=>{
        expect(emoore.authToken).not.toEqual('missing')
    })

    test.skip('GET /tokens', async ()=>{
        const r = await emoore.post.tokens({email:'ericdmoore', passphrase:'', TFA:''})
        expect(r).toEqual({})
    })

    test.skip('POST /tokens', async ()=>{
        const r = await emoore.post.tokens({email:'ericdmoore', passphrase:'', TFA:''})
        expect(r).toEqual({})
    })

    test.skip('PUT /tokens', async ()=>{
        const r = await emoore.post.tokens({email:'ericdmoore', passphrase:'', TFA:''})
        expect(r).toEqual({})
    })
    
    test.skip('DEL /tokens', async ()=>{
        const r = await emoore.post.tokens({email:'ericdmoore', passphrase:'', TFA:''})
        expect(r).toEqual({})
    })
})

describe.skip('/links',()=>{
    test('POST /links', async ()=>{
        const r = await emoore.post.tokens({email:'ericdmoore', passphrase:'', TFA:''})
        expect(r).toEqual({})
    })
    
    test('GET /links', async ()=>{
        const r = await emoore.post.tokens({email:'ericdmoore', passphrase:'', TFA:''})
        expect(r).toEqual({})
    })
})

describe.skip('/users',()=>{
    test('POST /users', async ()=>{
        const r = await emoore.post.tokens({email:'ericdmoore', passphrase:'', TFA:''})
        expect(r).toEqual({})
    })
    
    test('GET /users', async ()=>{
        const r = await emoore.post.tokens({email:'ericdmoore', passphrase:'', TFA:''})
        expect(r).toEqual({})
    })
})


