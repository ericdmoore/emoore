#!/usr/bin/env node
// import * as iam from '@aws-cdk/aws-iam'
// import 'source-map-support/register'
import * as cdk from '@aws-cdk/core'
import * as apigV2 from '@aws-cdk/aws-apigatewayv2'
import * as lambda from '@aws-cdk/aws-lambda'
import { CloudStack } from '../lib/cloud-stack'
import { config } from 'dotenv'
import { Functions } from '../lib/functions'
import { APIGateway } from '../lib/gateway'

// eslint-disable-next-line no-unused-vars
const processenv = config().parsed ?? {}

// #region interfaces

// eslint-disable-next-line no-unused-vars
interface APIconfigs{
  [routePath:string]:{
    path:string
    fn: lambda.Function
    methods?: apigV2.HttpMethod[],
    authorizer?: apigV2.IHttpRouteAuthorizer
  }
}

// #endregion interfaces

// func mamnifest
const funcs = {
  root: { src: ['root.ts'], path: '/', fn: null },
  graphql: { src: ['graphql.ts'], path: '/graphql', fn: null }
}

;(async () => {
  const app = new cdk.App()

  const cdkStack = new CloudStack(app, 'EmooreStack', {
    stackName: 'emoore-stack',
    description: 'An application that runs on emoo.re'
    /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
  })

  const srcBase = [__dirname, '../../src/funcs']
  const zipBase = [__dirname, '../fnPkgs']
  const basePaths = [srcBase, zipBase] as [string[], string[]]

  const cdkFunctions = new Functions(cdkStack, 'id', 'dist')

  cdkFunctions.addMoreFuncs(basePaths, funcs)

  const funcMap = await cdkFunctions.makeLambdas({}, {
    define: {
      'process.env.AWS_KEY': `"${processenv.AWS_KEY}"`,
      'process.env.AWS_SECRET': `"${processenv.AWS_SECRET}"`
    }
  })
  const fns = Object.entries(funcs).reduce((p, [fnID, val]) => ({
    ...p,
    [fnID]: { ...val, fn: funcMap[fnID] }
  }), {} as {[fnID:string]:{src:string[], path:string, fn: lambda.Function}})

  const api = new APIGateway(cdkStack, 'APIGateway', {
    name: 'emoore API Gateway',
    desc: 'The Gateway for emoore functions'
  })
  api.mergeRouteFunctions(fns)

  cdkStack.table.grantReadWriteData(funcMap.graphql)

  new cdk.CfnOutput(cdkStack, 'api-url', {
    exportName: 'api-url',
    value: api.httpApi.apiEndpoint,
    description: 'endpoint of the default entry point of the Http API'
  })

  //
})().catch(console.error)
