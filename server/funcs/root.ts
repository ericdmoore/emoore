import type { IFunc, SRet } from '../types'

// import { DynamoDB, Credentials } from 'aws-sdk'
// import { appTable } from '../entities'

// const dyn = new DynamoDB({
//   region: 'us-west-2',
//   credentials: new Credentials({
//     accessKeyId: process.env.AWS_KEY as string,
//     secretAccessKey: process.env.AWS_KEY as string
//   })
// })

export const handler: IFunc = async () => {
  // const desc = await dyn.describeTable({ TableName: appTable.name }).promise()
  // console.log(desc)
  return {
    statusCode: 300,
    headers: {
      Location: 'https://im.ericdmoore.com',
      'X-Developer': 'https://github.com/ericdmoore/emoore/wiki'
    }
  } as SRet
}

export default handler
