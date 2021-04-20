import { createModule, gql } from 'graphql-modules';
import { loadSchemaFromFsSync } from '../loadSchema'
import * as fs from 'fs'

export const emailMessage = createModule({
  id: 'emailMessage-Module',
  dirname: __dirname,
  typeDefs: gql(loadSchemaFromFsSync(fs, 'emailMessage.graphql'))
})

export default emailMessage