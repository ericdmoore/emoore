/**
 * @author Eric D Moore
 * 
 */

import { createCipheriv, createDecipheriv } from 'crypto'

const atob = (i:any)=>Buffer.from(i).toString('base64')
const btoa = (i:any)=>Buffer.from(i,'base64').toString('utf-8')

;(async()=>{

    const secret1 = Buffer.alloc(32, 0x05)
    const ivNonce1 = Buffer.alloc(12,0x1a)
    const message = 'Eric Moore'
    const assocData = Buffer.from(atob(JSON.stringify({alg:'chacha20'})))
    //
    console.log({secret1, ivNonce1, message, assocData, assocDataStr: btoa(assocData.toString()) })

    const cipher = createCipheriv('chacha20-poly1305', secret1 , ivNonce1, {authTagLength: 16})
    const scramble1 = cipher.update(message).toString('base64')
    cipher.setAAD(assocData, {plaintextLength : assocData.length})
    cipher.final()
    const authTag1 = cipher.getAuthTag()

    console.log({scramble1, authTag1: atob(authTag1.toString())})

    const decipher = createDecipheriv('chacha20-poly1305', secret1, ivNonce1, {authTagLength: 16})
    const decMessage1 = decipher.update(Buffer.from(btoa(scramble1))).toString('utf-8')
    decipher.setAAD( authTag1, { plaintextLength:assocData.length })

    console.log({scramble1, authTag1: btoa(authTag1.toString()), decMessage1})
    decipher.final()

    // const secret2 = secret1
    // const twoIV = Buffer.alloc(8,0xfc)
    // const message2 = message
    // const scramble2 = createCipheriv('chacha20-poly1305', secret2, twoIV)
    //     .update(message2)
    //     .toString('base64')
    //
    //
    // const decMessage2 = createDecipheriv('chacha20-poly1305',secret2, Buffer.alloc(8,0x55)).update( Buffer.from(scramble2,'base64'))
    //
    // console.log({scramble1, scramble2, decMessage1, decMessage2})
})()