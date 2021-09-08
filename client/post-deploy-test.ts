import emC from './index'

;(async ()=>{

    const baseURL = 'https://8wpbgn8oo4.execute-api.us-west-2.amazonaws.com'
    const emoore = emC(baseURL)
    const r = await emoore.root()
    const tok = await emoore.post.tokens({email:'ericdmoore', passphrase:'', TFA:''})
    console.log({ r, tok })

})()    
