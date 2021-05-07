//
import * as cdk from '@aws-cdk/core'
import * as lambda from '@aws-cdk/aws-lambda'
import * as apigV2 from '@aws-cdk/aws-apigatewayv2'
// eslint-disable-next-line no-unused-vars
import * as apiAuthV2 from '@aws-cdk/aws-apigatewayv2-authorizers'
// eslint-disable-next-line no-unused-vars
import * as apiIntegV2 from '@aws-cdk/aws-apigatewayv2-integrations'

// #region interfaces
type Dict<T> = {[ket:string]:T}

interface APIconfigInput{
  path:string
  fn: lambda.Function
  methods?: apigV2.HttpMethod[],
  authorizer?: apigV2.IHttpRouteAuthorizer
}

interface APIOutput{
  path:string
  fn: lambda.Function
  routes: apigV2.HttpRoute[]
}

// #endregion interfaces

export class APIGateway extends cdk.Construct {
    scope: cdk.Construct
    nodeId: string
    httpApi: apigV2.HttpApi
    authorizerFn: apigV2.HttpAuthorizer
    // stage: apigV2.HttpStage

    /**
     *
     * Functions Constructor
     * @param scope - cdk.Construct
     * @param id - Node ID in CFM tree
     * @param props - Dict of <src + zip path array>
     */
    constructor (scope: cdk.Construct, id: string, props:{name:string, desc:string}) {
      super(scope, id)
      this.scope = scope
      this.nodeId = id

      this.httpApi = new apigV2.HttpApi(this.scope, 'API Gateway', {
        apiName: props.name,
        description: props.desc
      })

      // this.authorizerFn = new apigV2.HttpAuthorizer(this.scope, 'HTTPAPI Authorizer', {
      //   type: apigV2.HttpAuthorizerType.LAMBDA,
      //   authorizerName: 'lambda-authorizer',
      //   httpApi: this.httpApi,
      //   identitySource: [
      //     '$request.header.Authorization',
      //     '$request.header.auth',
      //     '$context.routeKey',
      //     '$context.identity.sourceIp'
      //   ]
      // })

      // this.authorizor = new apigV2.CfnAuthorizer(this.scope, 'HTTPAPI CFM Authorizer', {
      //   name: 'lambda-authorizer',
      //   apiId: this.httpApi.apiId,
      //   authorizerType: apigV2.HttpAuthorizerType.LAMBDA,
      //   identitySource: [
      //     '$request.header.Authorization',
      //     '$request.header.auth',
      //     '$context.routeKey',
      //     '$context.identity.sourceIp'
      //   ],
      //
      //   authorizerResultTtlInSeconds: 60,
      //   authorizerPayloadFormatVersion: '2.0'
      //   authorizerUri: '',
      // })
    }

    /**
     *
     * @param input
     * @returns
     */
    mergeRouteFunctions (input: Dict<APIconfigInput>): Dict<APIOutput> {
      const merged = Object.entries(input).reduce((p, [k, v], i) => ({
        ...p,
        [k]: {
          ...v,
          routes: this.httpApi.addRoutes({
            path: v.path,
            methods: v.methods ?? [apigV2.HttpMethod.ANY],
            integration: new apiIntegV2.LambdaProxyIntegration({
              handler: v.fn,
              payloadFormatVersion: apigV2.PayloadFormatVersion.VERSION_2_0
            })
          })
        }
      }), {} as Dict<APIOutput>) as Dict<APIOutput>

      return merged
    }
}
