import { readFile } from "fs"
import { promisify } from 'util'
import { resolve } from 'path'

const readFileP = promisify(readFile)

export const Schema = readFileP(resolve(__dirname, './schema.graphql')).then(d => d.toString())

export const Query = {
    activeUser: function(){ return {name:'Tony Stark', id:42} },
    me: function(){ return {name:'Tony Stark', id:42} }
}

export const Mutation = {
    getUserToken: function(){return 'someTokenValue'}
}

export default {Query, Mutation, Schema}


