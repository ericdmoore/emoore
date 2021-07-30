import type {
  // eslint-disable-next-line no-unused-vars
  APIGatewayProxyHandlerV2 as Func,
  // eslint-disable-next-line no-unused-vars
  APIGatewayProxyEventV2 as Event,
  // eslint-disable-next-line no-unused-vars
  APIGatewayProxyResultV2 as Ret,
  // eslint-disable-next-line no-unused-vars
  APIGatewayProxyStructuredResultV2 as SRet
} from 'aws-lambda'

import JSON5 from 'json5'
// import { ApolloServer, gql } from 'apollo-server-express'
import { schemaFromGlobs } from '../merged'

// in order for esbuild to properly bundle
// the only I know of to resolve the dependency tree
// is to import all the 'gqlModules'
// wont be able to merge them from the fs
// AFAIK `dynamic imports` is typically used for code-splitting
// to reduce bundle size - this adding it that way will almost certainly
// cut them into some runtime module resolution - ;|

export const handler: Func = async (event, context) => {
  // const server = new ApolloServer({
  //   typeDefs: gql(await schemaFromGlobs()),
  //   resolvers: {},
  //   playground: true
  // })
  const payload = JSON5.parse(event.body || '{}')
  // eslint-disable-next-line no-unused-vars

  return payload 
  // return server.executeOperation({
  //   query: event.pathParameters?.query ?? payload?.query ?? '{ me { name } }',
  //   operationName: payload?.operationName,
  //   variables: payload?.variables
  // }).catch(console.error) as Ret
}

export default handler
