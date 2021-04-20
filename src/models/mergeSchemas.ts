import {readFile, rm, lstat, createWriteStream} from 'fs'
import {Readable} from 'stream'
import {resolve} from 'path'
import {promisify} from 'util'
import globby from 'globby'

const readfileP = promisify(readFile)
const rmP = promisify(rm)
const lstatP = promisify(lstat)

const loadFileStr = async ( path:string ) => (await readfileP(resolve(__dirname, path))).toString()

;(async ()=>{
    // const mergedSchemaPath =  resolve(__dirname,'./merged.gen.graphql')
    // const info =  await lstatP(mergedSchemaPath).catch(()=> {return {isFile: ()=>false }  })
    
    // if (info.isFile()){
    //     await rmP(mergedSchemaPath)
    // }

    const globPattern =  resolve(__dirname, './*.graphql')
    const excludes = [
        resolve(__dirname, './schema.graphql'),
        resolve(__dirname, './*.gen.graphql')
    ]
    const patterns = [ globPattern, ...excludes.map(p=> `!${p}`)]
    const modulePaths = (await globby(patterns)).filter(p => !excludes.includes(p))

    console.log({ patterns, modulePaths})

    const merged =  await modulePaths.reduce(
        async (p,path) => `${ await p }\n${ await loadFileStr(path) }`, 
        loadFileStr('./schema.graphql')
    )

    // console.log(merged)
    Readable.from(merged).pipe(createWriteStream(resolve(__dirname, './merged.gen.graphql')))


    const resolverPatternStr =  resolve(__dirname, './*.resolvers.ts')
    const resolverPattern = [resolverPatternStr] // , ...excludes.map(p=> `!${p}`)]
    const resolverPaths = await globby(resolverPattern)
    const resolvers = await resolverPaths
                    .map( async path => (await import(path)).default )
                    .reduce( async (p,m) => {
                        const prior = await p
                        const mod = await m
                        return { query: {
                                    ...prior.query,
                                    ...mod.query
                                }, mutation: {
                                    ...prior.mutation,
                                    ...mod.mutation
                                } }
                        }, Promise.resolve( { query:{},mutation:{}} ) 
                    )
    console.log({ resolvers })
    return resolvers
})().catch(console.error)
