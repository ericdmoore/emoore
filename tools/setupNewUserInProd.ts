// assert pwd === '/Users/ericmoore/Web/emoo-re/tools'
//
// npx ts-node -P ../node.tsconfig.json setupNewUserInProd.ts to cofirm setup
//
// npx esbuild \
// --bundle \
// --format=cjs \
// --platform=node  \
// --define:process.env.$(cat ../cloud/.env | grep 'AWS_KEY=') \
// --define:process.env.$(cat ../cloud/.env | grep 'AWS_SECRET=') \
// --define:process.env.$(cat ../cloud/.env | grep 'JWT_SECRET=') \
// --define:process.env.$(cat ../cloud/.env | grep 'JWT_SECRET_ID=') \
// --define:process.env.$(cat ../cloud/.env | grep 'TABLE_NAME=') \
// setupNewUserInProd.ts > setupUser.js

import { resolve } from 'path'
import { readFileSync } from 'fs'
import dotenv from 'dotenv'

const userPath = resolve('./user.env')
const prodPath = resolve('../cloud/.env')

dotenv.config({ path: userPath })
dotenv.config({ path: prodPath })

const vars = {
  ...dotenv.parse(readFileSync(userPath).toString()),
  ...dotenv.parse(readFileSync(prodPath).toString())
}

console.log({
  userPath,
  prodPath
  // vars,
  // envs: process.env //  dont print since secrets are now mixed in
})

const { EMAIL, PASSWORD, DISPLAYNAME, UACCT } = vars as any
console.log({ DISPLAYNAME })

;(async () => {
  const { user } = await import('../server/entities/users')
  // console.dir(user)
  const r = await user.genUser(EMAIL, PASSWORD, UACCT, DISPLAYNAME)
  console.dir(r)
})()
