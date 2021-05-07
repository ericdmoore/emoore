import type {
  // eslint-disable-next-line no-unused-vars
  APIGatewayProxyHandlerV2 as Func,
  // eslint-disable-next-line no-unused-vars
  APIGatewayProxyEventV2 as Event,
  // eslint-disable-next-line no-unused-vars
  APIGatewayProxyResultV2 as Ret,
  // eslint-disable-next-line no-unused-vars
  APIGatewayProxyStructuredResultV2 as SRet
} from 'aws-lambda'

import { DynamoDB, Credentials } from 'aws-sdk'
import { appTable } from '../entities/entities'

const dyn = new DynamoDB({
  region: 'us-west-2',
  credentials: new Credentials({
    accessKeyId: process.env.AWS_KEY as string,
    secretAccessKey: process.env.AWS_KEY as string
  })
})

export const handler: Func = async () => {
  const desc = await dyn.describeTable({ TableName: appTable.name }).promise()
  console.log(desc)
  return {
    statusCode: 200,
    isBase64Encoded: false,
    headers: { Location: 'http://im.ericdmoore.com' }
  } as SRet
}

export default handler
