import {readFileSync} from 'fs'
import {join} from 'path'
import * as graphql from 'graphql'

const p = join(__dirname, '../schema.graphql')
console.log({p})
const schema = readFileSync(p).toString()

const errs = graphql.validate(
    graphql.buildSchema(schema), 
    graphql.parse(schema)
)
console.log({errs})