const localDynamo = require('local-dynamo')
const { DynamoDB } = require('aws-sdk')

let dynamoLocal

module.exports = async () => {
  // start local Dynamo Svc
  // and set the internals of the Entity framework to use the locally configured reader/writer
  const port = 4567

  dynamoLocal = await localDynamo.launch(undefined, port)

  // const credentials = new Credentials({
  //   accessKeyId: process.env.AWS_KEY ?? 'NEVER_REPLACE_THIS_WITH_A_REAL_KEY',
  //   secretAccessKey: process.env.AWS_SECRET ?? 'NEVER_REPLACE_THIS_WITH_A_REAL_SECRET'
  // })

  console.log('...started dynamo local svc on pid: ', dynamoLocal.pid)
  console.log(process.env)

  const dyn = new DynamoDB({
    region: 'us-east-1',
    endpoint: `http://localhost:${port}`,
    credentials: {
      secretAccessKey: 'NEVER_REPLACE_THIS_WITH_A_REAL_KEY',
      accessKeyId: 'NEVER_REPLACE_THIS_WITH_A_REAL_SECRET'
    }
  })

  await dyn.createTable({
    TableName: 'emooreAppTable',
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
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  }).promise()
}
