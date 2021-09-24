import * as cdk from '@aws-cdk/core'
import * as s3 from '@aws-cdk/aws-s3'
import * as lambda from '@aws-cdk/aws-lambda'
import * as dynamodb from '@aws-cdk/aws-dynamodb'
import { Bucket } from '@aws-cdk/aws-s3'
import type { Function } from '@aws-cdk/aws-lambda'
// import bundleCDKFunction, { BundleOpts, BaseFuncOpts } from './nodeFunction'
// import * as s3assets from '@aws-cdk/aws-s3-assets' // file -> object
// import * as s3deploy from '@aws-cdk/aws-s3-deployment' // dir -> buckets

// #region interfaces

// #endregion interfaces
export class EmooreStack extends cdk.Stack {
  scope: cdk.Construct
  table: dynamodb.Table
  bucket: s3.Bucket
  functions: {[name:string]:lambda.Function} = {}

  constructor (scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, { ...props })
    this.scope = scope
    this.table = new dynamodb.Table(this, 'EmooreAppTable', {
      tableName: 'emooreAppTable',
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
    })
    this.bucket = new Bucket(this, 'fileBucket', { bucketName: 'emoore-links' })
  }

  grant (fnFuncs:{[fnName:string]:{fn: Function}}) {
    Object.values(fnFuncs).forEach(({ fn }) => {
      this.table.grantFullAccess(fn)
      this.bucket.grantReadWrite(fn)
    })
    return this
  }
}
