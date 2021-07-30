// import { graphql, printSchema, print, buildSchema, parse, validateSchema } from 'graphql'
// import {ApolloServer, gql} from 'apollo-server'
// import express from 'express'
// import bodyParser from 'body-parser'
// import { makeExecutableSchema } from 'graphql-tools'
// import { ApolloServer, gql } from 'apollo-server-express'
import { schemaFromGlobs } from './merged'

;(async () => {
  // eslint-disable-next-line no-unused-vars
  const operation = '{ me { name } }'
  async function startApolloServer () {
    // const app = express()
    // const server = new ApolloServer({
    //   typeDefs: gql(await schemaFromGlobs()),
    //   resolvers: {},
    //   playground: true
    // })

    // const res = await server.executeOperation({
    //     query: operation,
    // }).catch(console.error)

    // console.log('inline: ', JSON.stringify(res, null, 2))

    // await server.start()
    // server.applyMiddleware({ app })

    // app.use((req, res) => {
    //   res.status(200)
    //   res.send('Hello!')
    //   res.end()
    // })

    // await app.listen({ port: 4000 })

    // console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`)
    
    return {}
    // return { server, app }
  }
  const r = await startApolloServer()
  console.log(r)
})()
