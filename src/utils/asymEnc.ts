import { webcrypto } from 'crypto'
const { subtle } = webcrypto

export const  generateEd25519Key = async()=>{
  return subtle.generateKey({
    name: 'NODE-ED25519',
    namedCurve: 'NODE-ED25519',
  }, true, ['sign', 'verify']);
}

;(async ()=>{
  console.log(generateEd25519Key())
})()
