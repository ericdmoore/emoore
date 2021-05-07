/* eslint-disable @typescript-eslint/no-explicit-any */
import type * as k from '../types'

// eslint-disable-next-line no-unused-vars
import { DynamoDB, Credentials, SharedIniFileCredentials } from 'aws-sdk'
import { Table, Entity } from 'dynamodb-toolbox'
import { EntityAttributes } from 'dynamodb-toolbox/dist/classes/Entity'
import dateFmt from '../utils/dateFmt'
import ksuid from 'ksuid'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'

// #region interfaces
type Dict<T> = {[key:string]:T}
export type IBucketTimeResolutions = 'Min'|'Tmb'|'Hr'|'Day'|'Month'|'Year'

export interface iClickEventRangeQuery{
  short: string
  tsLo: number
  tsHi: number
}
export interface IQueryRangeReturn{
  Items: unknown[]
  Count: number
  ScannedCount: number
}

export interface LinkGet{
  short: string
}
export interface LinkPut{
  short: string
  long: string
  og?: Dict<string>
  ownerID?:string
  authzKey?:string
}

export interface ClickGet{
  short: string
  time: number
}

export interface ClickPut{
  short: string
  time: number
  long: string
  bucketID?: string
  ip?: string
  geo?: {regionType:string, value:string}[]
  tzOffSet?: number
  useragent?: {[deviceKey:string]:string}
}

export interface ClickBucketByTimeGet{
  short:string
  bucketID: string
  long?:string
  count?: number
  by?: IBucketTimeResolutions
}

export interface ClickBucketByPut{
  short: string
  count: number
  long?: string
  bucketID?: string
  by?: IBucketTimeResolutions
}

export interface LinkKind {
  short: string
  long :string
  og: {[ogPrefix:string]:string}
  ownerID: string
  authZKey: string
}

export interface UserKind {
  short: string
  long :string
  og: {[ogPrefix:string]:string}
  ownerID: string
  authZKey: string
}

// #endregion interfaces

export const epoch = () => Date.now() //  epoch time in ms

const credentials = process.env.AWS_KEY
  ? new Credentials({
    accessKeyId: process.env.AWS_KEY as string,
    secretAccessKey: process.env.AWS_SECRET as string
  })
  : new SharedIniFileCredentials({
    profile: 'default'
  })

const DocClient = new DynamoDB.DocumentClient({ credentials, region: 'us-west-2' })

export const appTable = new Table({
  name: 'emooreAppTable',
  partitionKey: 'pk',
  sortKey: 'sk',
  DocumentClient: DocClient
  // indexes: {
  //   userByEmail: {
  //     partitionKey: 'u#',
  //     sortKey: 'u#'
  //   }
  // }
})

export const customTimeStamps = (i: EntityAttributes): EntityAttributes => ({
  ...i,
  cts: { type: 'number', default: epoch, onUpdate: false },
  mts: { type: 'number', default: epoch, onUpdate: true }
})

export const link = {
  pk: (data:{short:string}) => `l#${data.short}`,
  sk: (data:{short:string}) => `l#${data.short}`,
  get: (i:{short:string}) => link.ent.get(i) as Promise<DocumentClient.GetItemOutput>,
  getBatch: async (i: {shorts: string[]}) => appTable.batchGet(i.shorts.map(short => link.ent.getBatch({ short }))) as Promise<DocumentClient.BatchGetItemOutput>,
  ent: new Entity({
    table: appTable,
    name: 'link',
    timestamps: false,
    attributes: customTimeStamps({
      short: { type: 'string' },
      //
      long: { type: 'string' },
      og: { type: 'map' },
      ownerID: { type: 'string' },
      authzKey: { type: 'string' },
      pk: { hidden: true, partitionKey: true, dependsOn: 'short', default: (data: k.TableType<LinkKind>) => `l#${data.short}` },
      sk: { hidden: true, sortKey: true, dependsOn: 'short', default: (data:LinkKind) => `l#${data.short}` }
    })
  })
}

export const user = {
  pk: (input:{email:string}) => `u#${decodeURI(input.email)}`,
  sk: (input:{email:string}) => `u#${decodeURI(input.email)}`,
  getViaEmail: (input:{email:string}) => user.ent.get(user.pk(input)) as Promise<DocumentClient.GetItemOutput>,
  ent: new Entity({
    table: appTable,
    name: 'user',
    timestamps: false,
    attributes: customTimeStamps({
      displayName: { type: 'string' },
      email: { type: 'string' },
      //
      pk: { hidden: true, partitionKey: true, dependsOn: 'uacct', default: (data:any) => `u#${data.uacct}` },
      sk: { hidden: true, sortKey: true, dependsOn: 'uacct', default: (data:any) => `u#${data.uacct}` }
    })
  })
}

export const userAccess = {
  pk: (i:{email: string}) => `u#${decodeURI(i.email)}`,
  sk: (i:{short: string}) => `ac#${decodeURI(i.short)}`,
  getBatch: async (i:{email: string, shorts:string[] }) => appTable.batchGet(i.shorts.map(short => userAccess.ent.getBatch({ uacct: i.email, short }))) as Promise<DocumentClient.BatchGetItemOutput>,
  query: (i:{email: string }) => appTable.query(userAccess.pk(i), { beginsWith: 'ac#' }) as Promise<DocumentClient.QueryOutput>,
  queryRange: (i:{email: string, startLink:string, endLink: string }) => appTable.query(
    userAccess.pk(i), {
      between: [
        userAccess.sk({ short: i.startLink }),
        userAccess.sk({ short: i.endLink })
      ]
    }) as Promise<DocumentClient.QueryOutput>,
  ent: new Entity({
    table: appTable,
    name: 'userAccess',
    timestamps: false,
    attributes: customTimeStamps({
      short: { type: 'string' },
      uacct: { type: 'string' },
      //
      long: { type: 'string' },
      role: { type: 'string' },
      displayName: { type: 'string' },
      pk: { hidden: true, partitionKey: true, dependsOn: 'uacct', default: (data:any) => `u#${data.uacct}` },
      sk: { hidden: true, sortKey: true, dependsOn: 'short', default: (data:any) => `ac#${data.short}` }
    })
  })
}

export const click = {
  pk: (i:{short:string}) => `c#${i.short}`,
  sk: (i:{ts:number}) => `tks#${ksuid.randomSync(i.ts).string}`,
  queryRange: async (i:iClickEventRangeQuery) => appTable.query(click.pk({ short: i.short }), { between: [click.sk({ ts: i.tsLo }), click.sk({ ts: i.tsHi })] }) as Promise<DocumentClient.QueryOutput>,
  ent: new Entity({
    table: appTable,
    name: 'click',
    timestamps: false,
    attributes: {
      short: { type: 'string' },
      long: { type: 'string' },
      ip: { type: 'string' },
      geo: { type: 'map' },
      tzOffSet: { type: 'number' },
      useragent: { type: 'map' },
      time: { type: 'number', default: epoch },
      // needs no mts, since its an event collector
      cts: { type: 'number', onUpdate: false, default: epoch },
      pk: { hidden: false, partitionKey: true, default: (data:any) => `c#${data.short}` },
      // use the "given time" not the "createdTime" - use case: back dating for testing
      sk: { hidden: false, sortKey: true, dependsOn: 'cts', default: (data:any) => `tks#${ksuid.randomSync(data.time).string}` }
    }
  }) as Entity<ClickPut>
}

const makeTimeBucketEntity = (table: Table, name:string, timeBucket: IBucketTimeResolutions) => {
  let tfmtStr: string

  switch (timeBucket) {
    case 'Min':
      tfmtStr = 'YYYYMMDDHHmm'
      break
    case 'Tmb':
      tfmtStr = 'YYYYMMDDHHtmb'
      break
    case 'Hr':
      tfmtStr = 'YYYYMMDDHH'
      break
    case 'Day':
      tfmtStr = 'YYYYMMDD'
      break
    case 'Month':
      tfmtStr = 'YYYYMM'
      break
    case 'Year':
      tfmtStr = 'YYYY'
      break
  }

  const dtFmtFn = dateFmt(tfmtStr)

  const ret = {
    pk: (i:{short:string}) => `lcBy${timeBucket}#${i.short}`,
    sk: (i:{bucketID: string | number}) => `t#${typeof i.bucketID === 'string' ? i.bucketID : dtFmtFn(i.bucketID)}`,
    by: () => timeBucket,
    queryRange: (i:{short:string, range:(string | number)[] }) => ret.ent.query(ret.pk(i),
      { between: i.range.map((bucketID: string | number) => ret.sk({ bucketID })) as [string, string] | [number, number] }) as Promise<DocumentClient.QueryOutput>,
    getBatch: (i:{short:string, buckets: [string | number]}) => ret.ent.table.batchGet(i.buckets.map(bucketID => ret.ent.getBatch({ short: i.short, bucketID }))),
    ent: new Entity({
      table,
      name,
      timestamps: false,
      attributes: customTimeStamps({
        short: { type: 'string' },
        bucketID: { type: 'string', dependsOn: 'cts', onUpdate: false, default: (data:any) => dtFmtFn(data.cts) },
        // cts + mts added
        long: { type: 'string' },
        count: { type: 'number', default: 0 },
        // Link Counts = ex:  lcByHr#ddg ; t#YYYYMMDDHH
        pk: { hidden: true, partitionKey: true, dependsOn: 'short', default: (data:any) => `lcBy${timeBucket}#${data.short}` },
        sk: { hidden: true, sortKey: true, dependsOn: 'bucketID', default: (data:any) => `t#${data.bucketID}` }
      })
    })
  }
  return ret
}

export const linkClickCountsByMin = makeTimeBucketEntity(appTable, 'linkClicksByTmb', 'Min') // can handle TZs
export const linkClickCountsByTmb = makeTimeBucketEntity(appTable, 'linkClicksByTmb', 'Tmb') // can handle TZs
export const linkClickCountsByHr = makeTimeBucketEntity(appTable, 'linkClicksByHour', 'Hr') // can handle TZs
export const linkClickCountsByDay = makeTimeBucketEntity(appTable, 'linkClicksByDay', 'Day') // subject to TZ noise
export const linkClickCountsByMonth = makeTimeBucketEntity(appTable, 'linkClicksByMonth', 'Month') // TZ offsets are hopefully jsut noise
export const linkClickCountsByYear = makeTimeBucketEntity(appTable, 'linkClicksByYear', 'Year') // TZ offsets are hopefully jsut noise
