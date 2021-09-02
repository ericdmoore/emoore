import ky from 'ky'

interface TokenInputUSerCreds{
    email:string
    passphrase:string
    TFA:string
    TFAtype?:string
}

interface TokenInputStartedToken{
    starterToken:string
}

type TokenInput = TokenInputStartedToken | TokenInputUSerCreds

export const client = (baseURL:string)=>{
    let authToken: string = 'missing'

    const postTokens =  (tokenResouce:string)=>(input: TokenInput)=>{
        if('email' in input){
            return ky.post(`${baseURL}/${tokenResouce}`,{headers:{
                email: encodeURIComponent(input.email),
                p: encodeURIComponent(input.passphrase),
                TFAchallengeResp: encodeURIComponent(input.TFA),
                TFAtype: encodeURIComponent(input.TFAtype ?? 'TOTP' ),
            }})
        }else{
            return ky.post(`${baseURL}/${tokenResouce}`,{headers:{
                authToken: input.starterToken
            }})
        }
    }
    const tokens = {
        resource:'tokens',
        get: async (user:string, pass:string, TFA:string)=>fetch(baseURL + tokens.resource,{ method:'GET', headers:{ authToken } }),
        put: postTokens('tokens'),
        post: postTokens('tokens'),
        del:  postTokens('tokens'),
    }

    const expand = {
        resource:'expand',
        get: (short:string)=>ky.get(`${baseURL}/${expand.resource}/${short}`,{headers:{authToken}}),
        // put:()=>ky.put(`${baseURL}/${expand.resource}`,{headers:{authToken}}),
        // post:()=>ky.post(`${baseURL}/${expand.resource}`,{headers:{authToken}}),
        // del:()=>ky.delete(`${baseURL}/${expand.resource}`,{headers:{authToken}})
    }

    const stats = {
        resource:'stats',
        get: ()=>ky.get(`${baseURL}/${stats.resource}`,{headers:{authToken}}),
        // put:()=>ky.put(`${baseURL}/${stats.resource}`,{headers:{authToken}}),
        // post:()=>ky.post(`${baseURL}/${stats.resource}`,{headers:{authToken}}),
        // del:()=>ky.delete(`${baseURL}/${stats.resource}`,{headers:{authToken}})
    }

    const links = {
        resource:'links',
        get: ()=>ky.get(`${baseURL}/${links.resource}`,{headers:{authToken}}),
        put:()=>ky.put(`${baseURL}/${links.resource}`,{headers:{authToken}}),
        post:()=>ky.post(`${baseURL}/${links.resource}`,{headers:{authToken}}),
        del:()=>ky.delete(`${baseURL}/${links.resource}`,{headers:{authToken}}),
    }

    const users = {
        resource:'users',
        get: async ()=>ky.get(`${baseURL}/${users.resource}`, { headers: {authToken}} ),
        put:()=>ky.put(`${baseURL}/${users.resource}`, { headers: {authToken}} ),
        post:()=>ky.post(`${baseURL}/${users.resource}`, { headers: {authToken}, json:{} } ),
        del:()=>ky.delete(`${baseURL}/${users.resource}`, { headers: {authToken}} ),
    }

    return {
        get: {
            users: users.get,
            expand: expand.get,
            stats: stats.get,
            links: links.get
        },
        put:{
            tokens: tokens.put,
            links: links.put
        },
        post: {
            tokens: tokens.post,
            links: links.post
        },
        del: {
            users: users.del,
            tokens: tokens.del,
            links: links.del
        },
        tokens,
        stats, 
        links,
        users,
    }
}



/**
 * 
 * import emC from ''
 * 
 * let r = await emC('https://somethingAwesome.com').root()
 * const emoore = await emC('https://somethingAwesome.com').cfg(r)
 * 
 * emoore.get.token()
 * emoore.get.user()
 * 
 * emoore.put.token()
 * emoore.post.token()
 * emoore.del.token()
 * 
 * emoore.get.expand()
 * emoore.get.stats()
 * 
 * emoore.post.links()
 * emoore.get.links()
 * emoore.put.links()
 * emoore.del.links()
 * 
 */


/**
 * 
 * To get a token, give your [user,pass,2FA] get back a token
 * Almost all Functions authenticate via token passed in via [H>Q>C]
 * Each call, amnde with a valid token, auto-refreshes/extends your tokens expiration
 * 
 * client(baseURL){
 * 
 *  const tokens = {get, post, put, del}
 *  const users  = {get, post, put, del}
 *  const links  = {get, post, put, del}
 *  const expand  = {get}
 *  const stats  = {get, post, put, del}
 * 
 *  return {
 *      get: ('GET', getResources )=>{},
 *      put: ('PUT, putResources )=>{},
 *      post: ('POST', postResources)=>{},
 *      del: ('DELETE', postResources)=>{},
 *      root: ()=>{}
 *  }
 * } 
 * 
 * 
 * 
 */
