#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CloudStack } from '../lib/cloud-stack';

import {config} from 'dotenv'
const processenv = config()

;(async ()=>{

  const app = new cdk.App();
  new CloudStack(app, 'CloudStack', {
    stackName:'emoore-app',
    description:'An application that runs on emoo.re'
    /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
  });

})().catch(console.error)
