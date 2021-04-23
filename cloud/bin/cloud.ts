#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from '@aws-cdk/core'
// import * as iam from '@aws-cdk/aws-iam'
import { CloudStack } from '../lib/cloud-stack'

import { config } from 'dotenv'
import { Functions } from '../lib/functions'

// eslint-disable-next-line no-unused-vars
const processenv = config().parsed ?? {}

// console.log({ processenv })

;(async () => {
  const app = new cdk.App()

  const cdkStack = new CloudStack(app, 'CloudStack', {
    stackName: 'emoore-app',
    description: 'An application that runs on emoo.re'
    /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
  })

  const srcBase = [__dirname, '../../src/funcs']
  const zipBase = [__dirname, '../fnPkgs']
  const basePaths = [srcBase, zipBase] as [string[], string[]]

  const cdkFunctions = new Functions(cdkStack, 'id', 'dist')
  cdkFunctions.addMoreFuncs(basePaths, {
    root: { src: ['root.ts'] },
    graphql: { src: ['graphql.ts'] }
  })

  const funcMap = await cdkFunctions.makeLambdas({}, {
    define: {
      'process.env.AWS_KEY': `"${processenv.AWS_KEY}"`,
      'process.env.AWS_SECRET': `"${processenv.AWS_SECRET}"`
    }
  })
  cdkStack.table.grantReadWriteData(funcMap.graphql)

  //
})().catch(console.error)
