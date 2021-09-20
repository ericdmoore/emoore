// import ky from 'ky'
// import ky from 'ky-universal';
import type { IUserPublic } from '../server/funcs/tokens'
import type { Response } from 'got'

import ky from 'got'
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
        expand: 'expand',
        stats: 'stats',
    }

    const postTokens =  (tokenResouce:string)=>async (input: TokenInput)=>{
        let r: Response
        if('email' in input){
            r = await ky.post(`${baseURL}/${tokenResouce}`,{
                    responseType:'json', 
                    headers:{
                        email: encodeURIComponent(input.email),
                        p: atob(input.passphrase),
                        TFAchallengeResp: encodeURIComponent(input.TFA),
                        TFAtype: encodeURIComponent(input.TFAtype ?? 'TOTP' ),
                    }
                })
        }else{
            r = await ky.post(`${baseURL}/${tokenResouce}`,{
                    responseType:'json',
                    headers:{
                        authToken: input.starterToken
                    }
                })
        }
        authToken = refreshAuthToken(authToken, r)
        return r as unknown as {authToken:string, user:IUserPublic}
    }

    const tokens = {
        get: async (input:TokenInputUSerCreds    | {token:string}) => {
            const r = await ky.get(`${baseURL}/${resNames.tokens}`, { 
                responseType:'json',
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
            return r as unknown as {refreshedAuthToken: string,
                user: IUserPublic
                delegateStarterTokens: string[], // I am a helper for these accounts, and they can revoke my access
                revocableDelegationStarterTokens: [string]}
                 // I have these helpers for my account}
        },
        put: postTokens('tokens'),
        post: postTokens('tokens'),
        del:  postTokens('tokens'),
    }

    const expand = {
        get: async (short:string)=>{
            const url = `${baseURL}/${resNames.expand}/${short}`
            console.log({ method:'GET', url })
            const r = await ky.get(url,{ responseType:'json', headers:{authToken} })
            authToken = refreshAuthToken(authToken, r)
            return r
        },
        // put:()=>ky.put(`${baseURL}/${expand.resource}`,{headers:{authToken}}),
        // post:()=>ky.post(`${baseURL}/${expand.resource}`,{headers:{authToken}}),
        // del:()=>ky.delete(`${baseURL}/${expand.resource}`,{headers:{authToken}})
    }

    const stats = {
        get: async ()=>{
            const r = await ky.get(`${baseURL}/${resNames.stats}`,{responseType:'json', headers:{authToken}})
            authToken = refreshAuthToken(authToken, r)
            return r
        },
        // put:()=>ky.put(`${baseURL}/${stats.resource}`,{headers:{authToken}}),
        // post:()=>ky.post(`${baseURL}/${stats.resource}`,{headers:{authToken}}),
        // del:()=>ky.delete(`${baseURL}/${stats.resource}`,{headers:{authToken}})
    }

    const links = {
        get: async () => {
            const r = await ky.get(`${baseURL}/${resNames.links}`,{ responseType:'json', headers:{authToken}})
            authToken = refreshAuthToken(authToken, r)
            return r
        },
        put: async () => {
            const r = await ky.put(`${baseURL}/${resNames.links}`,{ responseType:'json', headers:{authToken}} )
            authToken = refreshAuthToken(authToken, r)
            return r
        },
        post:async() => {
             const r = await ky.post(`${baseURL}/${resNames.links}`,{ responseType:'json', headers:{authToken}})
             authToken = refreshAuthToken(authToken, r)
             return r
        },
        del: async () => {
            const r = await ky.delete(`${baseURL}/${resNames.links}`,{ responseType:'json', headers:{authToken}})
            authToken = refreshAuthToken(authToken, r)
            return r
        },
    }

    const users = {
        get:  async ()=>{
            const r = await ky.get(`${baseURL}/${resNames.users}`, { responseType:'json',  headers: {authToken}} )
            authToken = refreshAuthToken(authToken, r)
            return r
        },
        put:  async ()=>{
            const r = await ky.put(`${baseURL}/${resNames.users}`, { responseType:'json',  headers: {authToken}} )
            authToken = refreshAuthToken(authToken, r)
            return r
        },
        post: async ()=>{
            const r = await ky.post(`${baseURL}/${resNames.users}`, { responseType:'json',  headers: {authToken}, json:{} } )
            authToken = refreshAuthToken(authToken, r)
            return r
        },
        del:  async ()=>{
            const r = await ky.delete(`${baseURL}/${resNames.users}`, { responseType:'json',  headers: {authToken}} )
            authToken = refreshAuthToken(authToken, r)
            return r
        },
    }
    const root = ()=>ky.get(baseURL, {followRedirect: false})

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
        root,
        tokens,
        stats, 
        links,
        users,
        expand,
        authToken
    }
}

export default client