// import type * as k from '../types'
import type { Table } from 'dynamodb-toolbox'
import type { DocumentClient } from 'aws-sdk/clients/dynamodb'
import type { IBucketTimeResolutions } from './entities'
import { appTable, customTimeStamps } from './entities'
import { Entity } from 'dynamodb-toolbox'
import dateFmt from '../utils/dateFmt'

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
