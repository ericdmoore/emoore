import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3'
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { Bucket } from '@aws-cdk/aws-s3';

import * as s3assets from '@aws-cdk/aws-s3-assets' // file -> object
import * as s3deploy from '@aws-cdk/aws-s3-deployment' // dir -> buckets

export class CloudStack extends cdk.Stack {
  table: dynamodb.Table
  bucket: s3.Bucket
  
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.table = new dynamodb.Table(this, 'EmooreAppTable', {
      tableName: 'emooreAppTable',
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name:'sk',type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    }); 

    this.bucket = new Bucket(this, 'fileBucket', {bucketName:'emoore-links'}) 
  }
}