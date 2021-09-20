/* eslint-disable @typescript-eslint/no-explicit-any */
// import type * as k from '../types'

// eslint-disable-next-line no-unused-vars
import { DynamoDB, Credentials, SharedIniFileCredentials } from 'aws-sdk'
import { Table } from 'dynamodb-toolbox'
import { EntityAttributes } from 'dynamodb-toolbox/dist/classes/Entity'

// #region interfaces
type Dict<T> = {[key:string]:T}
export type IBucketTimeResolutions = 'Min'|'Tmb'|'Hr'|'Day'|'Month'|'Year' |'AllTime'


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

export const config = process.env.AWS_KEY
  ? {
      region: 'us-west-2',
      // endpoint: undefined,
      credentials: new Credentials({
        accessKeyId: process.env.AWS_KEY as string,
        secretAccessKey: process.env.AWS_SECRET as string
      })
    }
  : { // local
      region: 'us-west-2',
      endpoint: 'http://localhost:4567',
      credentials: {
        secretAccessKey: 'NEVER_REPLACE_THIS_WITH_A_REAL_KEY',
        accessKeyId: 'NEVER_REPLACE_THIS_WITH_A_REAL_SECRET'
      }
    }

// console.dir({config})

export const appTable = new Table({
  name: process.env.TABLE_NAME ?? 'emooreAppTable',
  partitionKey: 'pk',
  sortKey: 'sk',
  DocumentClient: new DynamoDB.DocumentClient(config)
})

// console.dir({appTable})
// console.dir({docC: appTable.DocumentClient})

export const customTimeStamps = (i: EntityAttributes): EntityAttributes => ({
  ...i,
  cts: { type: 'number', default: epoch, onUpdate: false },
  mts: { type: 'number', default: epoch, onUpdate: true }
})
