// import ky from 'ky'
// import ky from 'ky-universal';
import ky from 'got'
import {Response} from 'got'
import { refreshToken } from '../server/auths/validJWT'
import {atob} from '../server/utils/base64'

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

const refreshAuthToken = (authToken:string, r: Response)=>{
    if(authToken ==='missing'){
        return r.headers['authToken'] as string|undefined ?? 'missing'
    }else{
        if(r.headers['authToken']){
            return r.headers['authToken'] as string
        }else{
            return authToken
        }
    }
}

export const client = (baseURL:string)=>{
    let authToken: string = 'missing'

    const resNames =  {
        tokens: 'tokens',
        links: 'links',
        users: 'users',
        expand: 'expamnd',
        stats: 'stats',
    }

    const postTokens =  (tokenResouce:string)=>async (input: TokenInput)=>{
        let r: Response
        if('email' in input){
            r = await ky.post(`${baseURL}/${tokenResouce}`,{headers:{
                email: encodeURIComponent(input.email),
                p: atob(input.passphrase),
                TFAchallengeResp: encodeURIComponent(input.TFA),
                TFAtype: encodeURIComponent(input.TFAtype ?? 'TOTP' ),
            }})
        }else{
            r = await ky.post(`${baseURL}/${tokenResouce}`,{headers:{
                authToken: input.starterToken
            }})
        }
        authToken = refreshAuthToken(authToken, r)
        return r
    }

 

    const tokens = {
        get: async (input:TokenInputUSerCreds    | {token:string}) => {
            const r = await ky.get(baseURL + resNames.tokens, { 
                headers:{ 
                    ...('token' in input 
                        ? {authToken: input.token} 
                        : {
                            email: encodeURIComponent(input.email),
                            p: atob(input.passphrase),
                            TFAchallengeResp: encodeURIComponent(input.TFA),
                            TFAtype: encodeURIComponent(input.TFAtype ?? 'TOTP' ),
                        }) 
                    } 
                })
            authToken = refreshAuthToken(authToken, r)
            return r
        },
        put: postTokens('tokens'),
        post: postTokens('tokens'),
        del:  postTokens('tokens'),
    }

    const expand = {
        get: async (short:string)=>{
            const r = await ky.get(`${baseURL}/${resNames.expand}/${short}`,{headers:{authToken}})
            authToken = refreshAuthToken(authToken, r)
            return r
        },
        // put:()=>ky.put(`${baseURL}/${expand.resource}`,{headers:{authToken}}),
        // post:()=>ky.post(`${baseURL}/${expand.resource}`,{headers:{authToken}}),
        // del:()=>ky.delete(`${baseURL}/${expand.resource}`,{headers:{authToken}})
    }

    const stats = {
        get: async ()=>{
            const r = await ky.get(`${baseURL}/${resNames.stats}`,{headers:{authToken}})
            authToken = refreshAuthToken(authToken, r)
            return r
        },
        // put:()=>ky.put(`${baseURL}/${stats.resource}`,{headers:{authToken}}),
        // post:()=>ky.post(`${baseURL}/${stats.resource}`,{headers:{authToken}}),
        // del:()=>ky.delete(`${baseURL}/${stats.resource}`,{headers:{authToken}})
    }

    const links = {
        get: async () => {
            const r = await ky.get(`${baseURL}/${resNames.links}`,{headers:{authToken}})
            authToken = refreshAuthToken(authToken, r)
            return r
        },
        put: async () => {
            const r = await ky.put(`${baseURL}/${resNames.links}`,{headers:{authToken}} )
            authToken = refreshAuthToken(authToken, r)
            return r
        },
        post:async() => {
             const r = await ky.post(`${baseURL}/${resNames.links}`,{headers:{authToken}})
             authToken = refreshAuthToken(authToken, r)
             return r
        },
        del: async () => {
            const r = await ky.delete(`${baseURL}/${resNames.links}`,{headers:{authToken}})
            authToken = refreshAuthToken(authToken, r)
            return r
        },
    }

    const users = {
        get:  async ()=>{
            const r = await ky.get(`${baseURL}/${resNames.users}`, { headers: {authToken}} )
            authToken = refreshAuthToken(authToken, r)
            return r
        },
        put:  async ()=>{
            const r = await ky.put(`${baseURL}/${resNames.users}`, { headers: {authToken}} )
            authToken = refreshAuthToken(authToken, r)
            return r
        },
        post: async ()=>{
            const r = await ky.post(`${baseURL}/${resNames.users}`, { headers: {authToken}, json:{} } )
            authToken = refreshAuthToken(authToken, r)
            return r
        },
        del:  async ()=>{
            const r = await ky.delete(`${baseURL}/${resNames.users}`, { headers: {authToken}} )
            authToken = refreshAuthToken(authToken, r)
            return r
        },
    }
    const root = ()=>ky.get(baseURL)

    return {
        get: {
            users: users.get,
            expand: expand.get,
            stats: stats.get,
            links: links.get,
            tokens: tokens.get
        },
        post: {
            tokens: tokens.post,
            links: links.post
        },
        put:{
            tokens: tokens.put,
            links: links.put
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
        root,
        authToken
    }
}

export default client