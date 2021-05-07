import { resolve } from 'path'
import { jwtSign } from './validJWT'
import { config } from 'dotenv'

config({ path: resolve(__dirname, '../../cloud/.env') })
const JWT_SECRET = process.env.JWT_SECRET
const JWT_SECRET_ID = process.env.JWT_SECRET_ID

;(async () => {
  console.log(JWT_SECRET?.slice(0, 5) + '***************')
  console.log(JWT_SECRET_ID?.slice(0, 5) + '***************')
  console.log(await jwtSign(JWT_SECRET)({ uacct: 'ericdmoore', maxl25: [] }, { keyid: JWT_SECRET_ID }))
})()
