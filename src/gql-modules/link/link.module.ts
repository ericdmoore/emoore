import { createModule, gql } from 'graphql-modules';
import { loadSchemaFromFsSync } from '../loadSchema'
import * as fs from 'fs'

// import { GraphQLString } from 'graphql'
// import { validateSchema, buildSchema, printSchema, GraphQLString} from 'graphql'
// import { schemaComposer, ObjectTypeComposerDefinition } from 'graphql-compose';

export const linkModule = createModule({
  id: 'linkModule',
  dirname: __dirname,
  typeDefs: gql(loadSchemaFromFsSync(fs, 'link.graphql'))
});

export default linkModule