const { DynamoDB } = require('aws-sdk')
const localDynamo = require('local-dynamo')

let dynamoLocal

module.exports = async () => {
  // start local Dynamo Svc
  // and set the internals of the Entity framework to use the locally configured reader/writer
  const port = 4567
  dynamoLocal = await localDynamo.launch(undefined, port)
  console.log('...started dynamo local svc on pid: ', dynamoLocal.pid)

  const dyn = new DynamoDB({ region: 'us-east-1', endpoint: `http://localhost:${port}` })
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
