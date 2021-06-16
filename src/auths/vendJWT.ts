import { resolve } from 'path'
import { config } from 'dotenv'
import { jwtVerify, jwtSign } from './validJWT'

config({ path: resolve(__dirname, '../../cloud/.env') })
const JWT_SECRET = process.env.JWT_SECRET
const JWT_SECRET_ID = process.env.JWT_SECRET_ID



// npx ts-node src/auths/vendJWT.ts
;(async () => {
  console.log(JWT_SECRET?.slice(0, 5) + '***************')
  console.log(JWT_SECRET_ID?.slice(0, 5) + '***************')
  const authToken  = await jwtSign(JWT_SECRET)({ email: 'eric.d.moore@gmail.com', uacct: 'ericdmoore', maxl25: [] }, { keyid: JWT_SECRET_ID })
  const obj = await jwtVerify()(authToken)
  console.log({authToken, obj})
})()
