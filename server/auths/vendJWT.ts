import accessToken from './tokens'
import { resolve } from 'path'
import { config } from 'dotenv'

config({ path: resolve(__dirname, '../../cloud/.env') })
const JWT_SECRET = process.env.JWT_SECRET
const JWT_SECRET_ID = process.env.JWT_SECRET_ID

// npx ts-node src/auths/vendJWT.ts
;(async () => {
  console.log(JWT_SECRET?.slice(0, 5) + '***************')
  console.log(JWT_SECRET_ID?.slice(0, 5) + '***************')
  const authToken = await accessToken().create({ email: 'eric.d.moore@gmail.com', uacct: 'ericdmoore', last25: [] })
  // const obj = await jwtVerify()(authToken)
  console.log({ authToken })
})()
