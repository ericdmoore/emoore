#!/usr/bin/env node
/* eslint-disable no-new */
// import * as iam from '@aws-cdk/aws-iam'
// import 'source-map-support/register'
import * as cdk from '@aws-cdk/core'
import * as apigV2 from '@aws-cdk/aws-apigatewayv2'
import * as lambda from '@aws-cdk/aws-lambda'
import AWS from 'aws-sdk'

import { EmooreStack } from '../lib/cloud-stack'
import { config } from 'dotenv'
import { Functions } from '../lib/functions'
import { APIGateway } from '../lib/gateway'

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

interface GatewaySrcConfig{
  src:string[],
  path:string,
  methods: apigV2.HttpMethod[],
}

type FnReadyForGateway = GatewaySrcConfig & {fn:lambda.Function}

// #endregion interfaces

console.error({ env1: process.env })
const processenv = config().parsed ?? {}

AWS.config.credentials = {
  accessKeyId: `"${process.env.AWS_KEY ?? process.env.AWS_ACCESS_KEY_ID ?? processenv.AWS_ACCESS_KEY_ID}"`,
  secretAccessKey: `"${process.env.AWS_SECRET ?? process.env.AWS_SECRET_ACCESS_KEY ?? processenv.AWS_SECRET_ACCESS_KEY}"`
}

// FUNC MANIFEST
const modules = ['clicks', 'links', 'stats', 'tokens', 'users']
const init: {[routeName:string]:GatewaySrcConfig} = {
  root: { path: '/', src: ['root.ts'], methods: [apigV2.HttpMethod.GET] },
  expand: { path: '/expand/{short}', src: ['expand.ts'], methods: [apigV2.HttpMethod.GET] }
}
const funcs = modules.reduce((p, c) => ({ ...p, [c]: { path: `/${c}`, src: [`${c}.ts`], methods: [apigV2.HttpMethod.ANY] } }), init)

;(async () => {
  const app = new cdk.App()

  const cdkStack = new EmooreStack(app, 'EmooreStack', {
    stackName: 'emoore-stack',
    description: 'A short link application for shrinking and expanding',
    env: { account: '172002748884', region: 'us-west-2' }
    /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
  })

  const srcBase = [__dirname, '../../server/funcs']
  const zipBase = [__dirname, '../fnPkgs']
  const basePaths = [srcBase, zipBase] as [string[], string[]]

  const funcMap = await new Functions(cdkStack, 'id', 'dist')
    .addMoreFuncs(basePaths, funcs)
    .bundleLambdas({}, {
      external: ['aws-sdk', 'mock-aws-s3', 'nock'],
      define: {
        'process.env.AWS_KEY': `"${process.env.AWS_ACCESS_KEY_ID ?? processenv.AWS_ACCESS_KEY_ID}"`,
        'process.env.AWS_SECRET': `"${process.env.AWS_SECRET_ACCESS_KEY ?? processenv.AWS_SECRET_ACCESS_KEY}"`
      }
    })

  const fns = Object.entries(funcs).reduce((p, [fnID, val]) => ({
    ...p,
    [fnID]: {
      ...val,
      fn: funcMap[fnID]
    }
  }), {} as {[fnID:string]:FnReadyForGateway})

  const api = new APIGateway(cdkStack, 'APIGateway', {
    name: 'emoore API Gateway',
    desc: 'The Gateway for emoore functions'
  })

  api.mergeRouteFunctions(fns)
  cdkStack.grant(fns)

  // cdkStack.table.grantReadWriteData(funcMap.graphql)

  new cdk.CfnOutput(cdkStack, 'api-url', {
    exportName: 'api-url',
    value: api.httpApi.apiEndpoint,
    description: 'endpoint of the default entry point of the Http API'
  })

  //
})().catch(console.error)

console.error({ env2: process.env })
