import * as fs from 'fs'
import * as t from 'io-ts'
// import { isRight } from 'fp-ts/Either'
import { createModule, gql } from 'graphql-modules';
import { loadSchemaFromFsSync } from '../loadSchema'

//#region iots-interfaces

const stringArr = t.array(t.string)

const Me = t.type({
  name: t.string,
  settings: t.string,
  ownedInboxes: stringArr, 
  sharedInboxes: stringArr
})

export type MeType = t.TypeOf<typeof Me>

// confirm that the Me type from the `base.graphql` is imported as an io-ts type
// #endregion iots-interfaces

export const resolvers = {
  me: (): MeType => ({ name:'Eric', settings: JSON.stringify({}), ownedInboxes:[], sharedInboxes:[] })
}

export const meModule = createModule({
  id: 'me-Module',
  dirname: __dirname,
  typeDefs:  gql(loadSchemaFromFsSync(fs, 'base.graphql')),
  resolvers
})

export default meModule

