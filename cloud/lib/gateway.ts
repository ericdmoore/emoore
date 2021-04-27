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
