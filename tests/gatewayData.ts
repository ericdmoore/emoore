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




export const event = (
  METHOD: 'GET'|'PUT'|'POST'|'DELETE', 
  path: string, 
  requestContext?: RequestContext,
  pathParameters?: Dict<string | undefined>,
  body?: string,
  stageVariables?: Dict<string | undefined>
) => {
  const reqCtx = {
    accountId: 'string',
    apiId: 'string',
    domainName: 'string',
    domainPrefix: 'string',
    requestId: 'string',
    routeKey: 'string',
    stage: 'string',
    time: 'string',
    timeEpoch: Date.now(),
    ...requestContext,
    http: {
      method: METHOD,
      path,
      protocol: 'https',
      sourceIp: '75.8.99.75',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36',
      ...requestContext?.http
    },
  }

  return {
    version: 'v2',
    routeKey: `${METHOD} ${path}`,
    rawPath: `${path}`,
    rawQueryString: '',
    headers: {} as {[key:string]: string},
    isBase64Encoded: false,
    requestContext: reqCtx,
    body,
    pathParameters,
    stageVariables,
  } as Event
}

export interface IRequestContext {
  accountId: string
  apiId: string
  domainName: string
  domainPrefix: string
  http: Partial<IRequestContext_Http>
  requestId: string
  routeKey: string
  stage: string
  time: string
  timeEpoch: number
}

export interface IRequestContext_Http{
    method: string
    path: string
    protocol: string
    sourceIp: string
    userAgent: string
}

export type RequestContext = Partial<IRequestContext>
type Dict<T> = {[name:string]:T}

// console.log(JSON.stringify(event("GET",'/expand/me'),null, 2))