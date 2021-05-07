import * as dynaEnt from './entities/entities'

// import { DynamoDB, SharedIniFileCredentials } from 'aws-sdk'
// const credentials = new SharedIniFileCredentials({ profile: 'default' })

// const DocumentClient = new DynamoDB.DocumentClient({credentials, region:'us-west-2'})

;(async () => {
  // // API / Network Test
  // const dyna = new DynamoDB({credentials, region:'us-west-2'})
  // console.log(await dyna.listTables().promise().catch(console.error))
  // console.log(await dyna.describeTable({TableName:'emooreAppTable'}).promise().catch(console.error))

  // const ddgWhole = {short:'ddg', long:'https://ddg.co'}
  // const r1 = await dynaEnt.link.put(ddgWhole)
  //     .catch(er=> console.error('link.put ERR:',er ))
  // console.log({r1})\

  const ddgGet = { short: 'ddg' }
  const r2 = await dynaEnt.link.get(ddgGet)
    .catch(er => console.error('link.get ERR:', er))
  console.log({ r2 })
})().catch(console.error)

// #region interfaces

export interface LinkKind {
    shorturl: string
    longurl :string
}
export type TableType<T> = T & { pk:string; sk:string }

// #endregion interface
