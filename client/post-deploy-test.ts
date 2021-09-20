import emC from './index'

;(async ()=>{

    const baseURL = 'https://8wpbgn8oo4.execute-api.us-west-2.amazonaws.com'
    const emoore = emC(baseURL)

    const r = await emoore.root()
    const e = await emoore.expand.get('somelink').catch(er=>{ console.error({er}); return null})
    
    console.log({ r, e })
    console.log({ rootHrdLoc: r.headers.location, expLocRedir: e?.headers?.location  })

    // const tok = await emoore.post.tokens({email:'ericdmoore', passphrase:'', TFA:''})

})()