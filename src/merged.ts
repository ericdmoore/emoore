import type { Json } from 'fp-ts/lib/Either'

import { readFile } from 'fs'
import { resolve } from 'path'
import { promisify } from 'util'

import globby from 'globby'
import merge from 'merge-deep'

const readfileP = promisify(readFile)
const loadFileStr = async (path:string) => (await readfileP(resolve(__dirname, path))).toString()

type PromiseOr<T> = T | Promise<T>
export type Dict<T> = { [key:string]: T }
export type Func = () => PromiseOr<Json>
export type GQLModule = {Query: Dict<Func>, Mutation: Dict<Func>, Schema: Promise<string>}

export const schemaFromGlobs = async (globs:string[] = ['./models/*.graphql']) => {
  const globPatterns = globs.map(s => resolve(__dirname, s))
  const excludes = [
    resolve(__dirname, './models/schema.graphql'),
    resolve(__dirname, './models/*.gen.graphql')
  ]
  const patterns = [...globPatterns, ...excludes.map(p => `!${p}`)]
  const modulePaths = (await globby(patterns)).filter(p => !excludes.includes(p))

  const merged = await modulePaths.reduce(
    async (p, path) => `${await p}\n${await loadFileStr(path)}`,
    loadFileStr('./models/schema.graphql')
  )
  return merged
}

export const resolversFromGlobs = async (globs: string[] = ['./models/*.resolvers.ts'], exclusions : string[] = []) => {
  const resolverPatternGlobs = globs.map(g => resolve(__dirname, g))
  const resolverExclusions = exclusions.map(g => `!${resolve(__dirname, g)}`)
  const resolverPatterns = [...resolverPatternGlobs, ...resolverExclusions]
  const resolverPaths = await globby(resolverPatterns)
  const resolvers = await resolverPaths
    .map(async path => (await import(path)).default)
    .reduce(async (p, m) => merge(await p as GQLModule, await m as GQLModule),
      Promise.resolve({ Query: {}, Mutation: {}, Schema: Promise.resolve('') })
    ) as GQLModule
  return {
    Query: resolvers.Query,
    Mutation: resolvers.Mutation
  }
}
