import type {readFile, readFileSync} from 'fs'
import { resolve as pathResolve} from 'path'

export const loadSchemaFromFsSync = (fs:{readFileSync: typeof readFileSync}, path:string) => 
  fs.readFileSync(pathResolve(__dirname, path)).toString()

export const loadSchemaFromFs = (fs:{readFile: typeof readFile}, path:string ) => 
  new Promise((resolve, reject)=>{
    fs.readFile( pathResolve(__dirname, path), (err, data)=>{
        err 
        ? reject(err) 
        : data 
            ? resolve(data.toString()) 
            : reject(new Error(`file was undefined`))
    })
  })

export default loadSchemaFromFsSync