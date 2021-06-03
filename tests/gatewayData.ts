import type {
  APIGatewayProxyEventV2 as Event,
  APIGatewayEventRequestContext as Context
} from 'aws-lambda'

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
  /** next set is @deprecated-  Use handler callback or promise result */
  done: (error?: Error, result?: any) => { if (error) throw error },
  fail: (error: Error | string) => { if (error) throw error },
  succeed: (messageOrObject: any) => {}
} as unknown as Context

export const event = (METHOD: 'GET'|'PUT'|'POST'|'DELETE', path: string) => ({
  version: 'v2',
  routeKey: `${METHOD} ${path}`,
  rawPath: `${path}`,
  rawQueryString: '',
  headers: {} as {[key:string]: string},
  requestContext: {
    accountId: 'string',
    apiId: 'string',
    domainName: 'string',
    domainPrefix: 'string',
    http: {
      method: METHOD,
      path,
      protocol: 'https',
      sourceIp: '75.8.99.75',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36'
    },
    requestId: 'string',
    routeKey: 'string',
    stage: 'string',
    time: 'string',
    timeEpoch: Date.now()
  },
  isBase64Encoded: false
}) as Event
