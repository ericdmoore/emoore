const localDynamo = require('local-dynamo')
const { DynamoDB } = require('aws-sdk')

const TABLE_NAME = 'emooreAppTable'
const TableName = TABLE_NAME

const main = async () => {
  // start local Dynamo Svc
  // and set the internals of the Entity framework to use the locally configured reader/writer
  
  // jest.setTimeout(10000); // in milliseconds

  const port = 4567
  const dynamoLocal = await localDynamo.launch(undefined, port)
  console.log('...started dynamo local svc on pid: ', dynamoLocal.pid)

  const config = process.env.AWS_KEY
    ? {
        region: 'us-west-2',
        endpoint: 'http://localhost:4567',
        credentials: {
          accessKeyId: process.env.AWS_KEY,
          secretAccessKey: process.env.AWS_SECRET
        }
      }
    : {
        region: 'us-west-2',
        endpoint: 'http://localhost:4567',
        credentials: {
          secretAccessKey: 'NEVER_REPLACE_THIS_WITH_A_REAL_KEY',
          accessKeyId: 'NEVER_REPLACE_THIS_WITH_A_REAL_SECRET'
        }
      }

  const dyn = new DynamoDB(config)
  await dyn.createTable({
    TableName,
    AttributeDefinitions: [
      { AttributeName: 'pk', AttributeType: 'S' },
      { AttributeName: 'sk', AttributeType: 'S' }
    ],
    KeySchema: [
      { AttributeName: 'pk', KeyType: 'HASH' },
      { AttributeName: 'sk', KeyType: 'RANGE' }
    ],
    BillingMode: 'PAY_PER_REQUEST',
    ProvisionedThroughput: {
      ReadCapacityUnits: 10,
      WriteCapacityUnits: 10
    }
  }).promise()

  const described = await dyn.describeTable({ TableName }).promise().catch(console.error)
  console.log({
    TableStatus: described?.Table?.TableStatus,
    ItemCount: described?.Table?.ItemCount,
    TableArn: described?.Table?.TableArn
  })

  return null
}

module.exports = main

;(async () => {
  if (!module.parent) {
    console.log('independent run')
    await main().catch(console.error)
    console.log('leaving open... to run the service')
  }
})()
