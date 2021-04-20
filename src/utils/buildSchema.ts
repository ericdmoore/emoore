import * as graphql from 'graphql'
import { createApplication } from 'graphql-modules';
import base from '../gql-modules/base/base.module'
// import link from './gql-modules/link.module'
// import clickHist from './gql-modules/clickHistory.module'
// import emailMsg from './gql-modules/emailMessage-module'

// console.error(link)
console.error(base)

const builtAppStuff = createApplication({
  modules: [base]
});

// to the terminal
// console.error(builtAppStuff)

// This is the work horse for `npm run schema:gen`
process.stdout.write(`# lint-disable type-fields-sorted-alphabetically\n`)
process.stdout.write(graphql.printSchema(builtAppStuff.schema))