import  { graphql, printSchema, print, buildSchema, parse, validateSchema } from 'graphql'
// import {ApolloServer, gql} from 'apollo-server'

import express from 'express'
import bodyParser from 'body-parser'
import { makeExecutableSchema } from 'graphql-tools'
import { ApolloServer, gql} from 'apollo-server-express'
import {schemaFromGlobs, resolversFromGlobs} from './merged'

// const authorsArr = [
//     {name:'Malcolm Gladwell', dob:12344 },
//     {name:'Yuval Noah Harari', dob:12345 },
// ]
// const booksArr = [
//     {by: 0, name:'Tipping Point', ISBN:1234 },
//     {by: 0, name:'David and Goliath', ISBN:1234 },
//     {by: 1, name:'Homo Deus', ISBN:1234 }
// ]
 
// var schema = buildSchema(`
//   type Query {
//     greeting: String
//     authors(id: Int!): Author
//     rollDice(dice:Int!, sides:Int!): [Int]!
//   }
//   type Author{
//       name: String!
//       books: [String]!
//   }
// `);

// var resolvers = { 
//     greeting: () => 'Hello world!',
//     allo: () => "G'day Mate!",
//     rollDice: (i: {dice:number, sides:number}, _:any, ctx:any)=> Array(i.dice).fill(0).map(()=> Math.ceil(i.sides * Math.random())),
//     authors: function(i: {id:number}, _:any, ctx:any){
//         // console.log(arguments)
//         console.log({id: i.id})
//         return{
//             name: ()=>authorsArr[i.id].name ?? 'Malcolm Gladwell',
//             books: ()=> booksArr
//                     .filter(b=>b.by === i.id)
//                     .map(b=>b.name)
//         }    
//     }
// }

// const operation = `query { 
//     greeting, 
//     author0: authors(id:0){
//         name, books
//     }
//     author1: authors(id:1){
//         name, books
//     }
//     player1: rollDice(dice:4, sides:6)
//     player2: rollDice(dice:4, sides:6)
//     player3: rollDice(dice:4, sides:6)
// }` 


// ;(async ()=>{
//     const operation = `{ me { name } }`
    
//     const schemaStr = await schemaFromGlobs()
//     const resolvers = await resolversFromGlobs()
//     console.log({resolvers})
    
//     const errs = validateSchema(buildSchema(schemaStr))
//     console.log('Schema Validation Errors:\n',errs)
    
//     const schema = buildSchema(schemaStr)
//     console.log({schema}, operation)

//     const schemaExec =  makeExecutableSchema({typeDefs: schemaStr, resolvers})
//     console.log({schemaExec})

//     const res = await graphql(schema, operation, resolvers)
//     console.log(JSON.stringify(res,null, 2))

// })().catch(console.error)





// schemaFromGlobs()
// .then((schemaStr)=>{
//     const typeDefs = gql(schemaStr)
//     console.log(typeDefs)

//     const server = new ApolloServer({
//         typeDefs,
//         mocks:true
//         playground: true,
//         introspection: true,
//     })
//     return server.listen()
// }).then(({url})=>{
//     console.log(`Server running at: ${url}`)
// }).catch(console.error)



;(async ()=>{    
    const operation = `{ me { name } }`
    async function startApolloServer() {
        const app = express();
        const server = new ApolloServer({
            typeDefs: gql(await schemaFromGlobs()),
            resolvers: await resolversFromGlobs(),
            playground: true
        });
        
        // const res = await server.executeOperation({
        //     query: operation,
        // }).catch(console.error)

        // console.log('inline: ', JSON.stringify(res, null, 2))
        
        await server.start();
        server.applyMiddleware({ app });

        app.use((req, res) => {
            res.status(200);
            res.send('Hello!');
            res.end();
        });

        await app.listen({ port: 4000 });
        
        console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`);
        return { server, app };
    }
    const r = await startApolloServer()
    console.log(r)
})()