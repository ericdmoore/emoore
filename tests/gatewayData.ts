export const ctx = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'string',
  functionVersion: 'string',
  invokedFunctionArn: 'string',
  memoryLimitInMB: 'string',
  awsRequestId: 'string',
  logGroupName: 'string',
  logStreamName: 'string',
  getRemainingTimeInMillis: () => 1000,
  /** next set @deprecated-  Use handler callback or promise result */
  done: (error?: Error, result?: any) => { if (error) throw error },
  fail: (error: Error | string) => { if (error) throw error },
  succeed: (messageOrObject: any) => {}
}

export const event = {
  version: 'v2',
  routeKey: '',
  rawQueryString: '',
  isBase64Encoded: false,
  rawPath: '/',
  headers: { '': '' },
  requestContext: {
    accountId: 'string',
    apiId: 'string',
    domainName: 'string',
    domainPrefix: 'string',
    http: {
      method: 'string',
      path: 'string',
      protocol: 'string',
      sourceIp: 'string',
      userAgent: 'string'
    },
    requestId: 'string',
    routeKey: 'string',
    stage: 'string',
    time: 'string',
    timeEpoch: Date.now()
  }
}
