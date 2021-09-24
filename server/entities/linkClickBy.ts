// // import type * as k from '../types'
// import type { Table } from 'dynamodb-toolbox'
// import type { DocumentClient } from 'aws-sdk/clients/dynamodb'
// import type { IBucketTimeResolutions } from './entities'
// import { appTable, customTimeStamps } from './entities'
// import { Entity } from 'dynamodb-toolbox'
// import dateFmt from '../utils/dateFmt'
// import {
//   makeSteppedArray,
//   monthedSteppedArray
// } from '../utils/ranges/time'
// // import PQueue from 'p-queue'
// import promiseSequential from '../utils/promises/sequential'

// // interface ClicksByTime{
// //   // q: PQueue
// //   addCount: (i:{short:string, long:string, dateTime?:number, incr?:number})=>{
// //     go:()=>Promise<DocumentClient.UpdateItemOutput>
// //   }
// // }

// type NumberedDict<KeyType, ValType> = {
//   [Property in keyof KeyType as `${(string & Property)}`]: ValType
// };

// type One2Three = {'1':0, '2':0, '3':0}
// type One2Four = {'1':0, '2':0, '3':0, '4':0}
// type One2Seven = {'1':0, '2':0, '3':0, '4':0, '5':0, '6':0, '7':0}
// type One2TwentyFour = {'1':0, '2':0, '3':0, '4':0, '5':0, '6':0, '7':0, '8':0, '9':0, '10':0, '11':0, '12':0, '13':0, '14':0, '15':0, '16':0, '17':0, '18':0, '19':0, '20':0, '21':0, '22':0, '23':0, '24':0}

// export type IHoursAgo = NumberedDict<One2TwentyFour, number>
// export type IDaysAgo = NumberedDict<One2Seven, number>
// export type IWeeksAgo = NumberedDict<One2Four, number>
// export type IMonthsAgo = NumberedDict<One2Three, number>

// export interface ExpandLinkHistory{
//   allTimeExpansions: number
//   lastClick: number
//   maxElapsedBetweenClicks?: number
//   hoursAgo: IHoursAgo
//   daysAgo: IDaysAgo
//   weeksAgo: IWeeksAgo
//   monthsAgo: IMonthsAgo
// }

// export interface ILinksByDuration{
//   bucketID: string
//   short: string
//   long: string
//   count: number
//   cts: number
//   mts: number
//   entity: 'linkClicksByMin' | 'linkClicksByTmb' | 'linkClicksByHour' | 'linkClicksByDay' | 'linkClicksByMonth' | 'linkClicksByYear' | 'linkClicksByAll'
// }

// const makeTimeBucketEntity = (table: Table, name:string, timeBucket: IBucketTimeResolutions) => {
//   let tfmtStr: string

//   switch (timeBucket) {
//     case 'Min':
//       tfmtStr = 'YYYYMMDDHHmm'
//       break
//     case 'Tmb':
//       tfmtStr = 'YYYYMMDDHHtmb'
//       break
//     case 'Hr':
//       tfmtStr = 'YYYYMMDDHH'
//       break
//     case 'Day':
//       tfmtStr = 'YYYYMMDD'
//       break
//     case 'Month':
//       tfmtStr = 'YYYYMM'
//       break
//     case 'Year':
//       tfmtStr = 'YYYY'
//       break
//     case 'AllTime':
//       tfmtStr = 'AllTime'
//       break
//   }

//   const dtFmtFn = dateFmt(tfmtStr)

//   /**
//    * @todo - set concurrency based on hardware available - potentially based on production env?
//    */
//   const ret = {
//     // q: new PQueue({concurrency:2}),
//     pk: (i:{short:string}) => `lcBy${timeBucket}#${i.short}`,
//     sk: (i:{bucketID: string | number}) => `t#${ret.bucketID(i.bucketID)}`,
//     bucketID: (bucketID: string | number) => `${typeof bucketID === 'string' ? bucketID : dtFmtFn(bucketID)}`,
//     by: () => timeBucket,
//     // needs test
//     addCount: (inputs:{short:string, long:string, dateTime:number, incr?:number}) => {
//       const incr = inputs.incr ?? 1
//       const data = {
//         short: inputs.short,
//         bucketID: ret.bucketID(inputs.dateTime),
//         count: { $add: incr }
//       }
//       const updateParam = ret.ent.updateParams(data)
//       return {
//         go: async () => ret.ent.update(data) as Promise<DocumentClient.UpdateItemOutput>,
//         updateParam,
//         data
//       }
//       // console.log(r)
//       // return r
//     },
//     queryRange: (i:{short:string, range:(string | number)[] }) => ret.ent.query(ret.pk(i),
//       { between: i.range.map((bucketID: string | number) => ret.sk({ bucketID })) as [string, string] | [number, number] }) as Promise<DocumentClient.QueryOutput>,
//     getBatch: async (i:{short:string, bucketIDs: string[]}): Promise<ILinksByDuration[]> =>
//       ret.ent.table.batchGet(i.bucketIDs.map(bucketID => ret.ent.getBatch({ short: i.short, bucketID })))
//         .then(d => {
//         // console.log(i.short, i.bucketIDs)
//         // console.dir(d)
//           return d.Responses[ret.ent.table.name] as ILinksByDuration[]
//         }),
//     ent: new Entity({
//       table,
//       name,
//       timestamps: false,
//       attributes: customTimeStamps({
//         short: { type: 'string' },
//         bucketID: { type: 'string', dependsOn: 'cts', onUpdate: false, default: (data:any) => dtFmtFn(data.cts) },
//         // cts + mts added
//         long: { type: 'string' },
//         count: { type: 'number', default: 0 },
//         // Link Counts = ex:  lcByHr#ddg ; t#YYYYMMDDHH
//         pk: { hidden: true, partitionKey: true, dependsOn: 'short', default: (data:any) => ret.pk(data) },
//         sk: { hidden: true, sortKey: true, dependsOn: 'bucketID', default: (data:any) => ret.sk(data) }
//       })
//     })
//   }
//   return ret
// }

// export const linkClickCountsByMin = makeTimeBucketEntity(appTable, 'linkClicksByMin', 'Min') // can handle TZs
// export const linkClickCountsByTmb = makeTimeBucketEntity(appTable, 'linkClicksByTmb', 'Tmb') // can handle TZs
// export const linkClickCountsByHr = makeTimeBucketEntity(appTable, 'linkClicksByHour', 'Hr') // can handle TZs
// export const linkClickCountsByDay = makeTimeBucketEntity(appTable, 'linkClicksByDay', 'Day') // subject to TZ noise
// export const linkClickCountsByMonth = makeTimeBucketEntity(appTable, 'linkClicksByMonth', 'Month') // TZ offsets are hopefully jsut noise
// export const linkClickCountsByYear = makeTimeBucketEntity(appTable, 'linkClicksByYear', 'Year') // TZ offsets are hopefully jsut noise
// export const linkClickCountsAllTime = makeTimeBucketEntity(appTable, 'linkClicksByAll', 'AllTime') // TZ offsets are hopefully jsut noise

// // leave as global so all function calls are governed
// // const saveEventQueue = new PQueue({concurrency:2})

// export const saveExpandEvent = (short:string, long:string, dateTime:number = Date.now(), incr?:number) => {
//   const indexKinds = [
//     linkClickCountsByMin,
//     linkClickCountsByTmb,
//     linkClickCountsByHr,
//     linkClickCountsByDay,
//     linkClickCountsByMonth,
//     linkClickCountsByYear,
//     linkClickCountsAllTime
//   ]

//   const updateParams = indexKinds.map(kind => kind.addCount({ short, long, dateTime, incr }).updateParam)
//   const arrP = indexKinds.map(kind => kind.addCount({ short, long, dateTime, incr }).go())

//   return {
//     updateParams, // batchOperation not supported - use a queue or limitor
//     updateIndexes: () => promiseSequential(arrP as Promise<DocumentClient.UpdateItemOutput>[])
//     // go: () => Promise.all( indexKinds.map( kind => saveEventQueue.add(kind.addCount({short, long, dateTime, incr}).go )) ) // not using since PQueue is having import issues
//   }
// }

// // const stepByTenMinBlock = minSteppedArray(10)
// const stepByHour = makeSteppedArray(1000 * 3600)
// const stepByDay = makeSteppedArray(1000 * 3600 * 24)
// const stepByMonth = monthedSteppedArray

// /** Zero through 4 */
// const daysToWeeks = (p:number[], c:ILinksByDuration, i:number) => {
//   return p
// }

// const bumpAllKeys = (nums: number[]) => Object.fromEntries(nums.map((count, i) => ([i + 1, count])))

// export const getLinkHistory = async (short:string) :Promise<ExpandLinkHistory> => {
//   const [all, hours24, days28, months3] = await Promise.all([
//     linkClickCountsAllTime.getBatch({ short, bucketIDs: [linkClickCountsAllTime.bucketID('_all')] }),
//     linkClickCountsByHr.getBatch({ short, bucketIDs: stepByHour(24).map(n => linkClickCountsByHr.bucketID(n)) }),
//     linkClickCountsByDay.getBatch({ short, bucketIDs: stepByDay(28).map(n => linkClickCountsByDay.bucketID(n)) }),
//     linkClickCountsByMonth.getBatch({ short, bucketIDs: stepByMonth(3).map(n => linkClickCountsByMonth.bucketID(n)) })
//   ])
//   return {
//     allTimeExpansions: all[0].count,
//     maxElapsedBetweenClicks: undefined,
//     lastClick: Date.now(),
//     hoursAgo: bumpAllKeys(hours24.map(d => d.count)) as unknown as NumberedDict<One2TwentyFour, number>,
//     daysAgo: bumpAllKeys(days28.map(d => d.count)) as unknown as NumberedDict<One2Seven, number>,
//     weeksAgo: bumpAllKeys(days28.reduce(daysToWeeks, [] as number[])) as unknown as NumberedDict<One2Four, number>,
//     monthsAgo: bumpAllKeys(months3.map(m => m.count)) as unknown as NumberedDict<One2Three, number>
//   }
// }

// export const caughtError: ExpandLinkHistory = {
//   allTimeExpansions: -1,
//   maxElapsedBetweenClicks: undefined,
//   lastClick: -1,
//   hoursAgo: {
//     1: -1,
//     2: -1,
//     3: -1,
//     4: -1,
//     5: -1,
//     6: -1,
//     7: -1,
//     8: -1,
//     9: -1,
//     10: -1,
//     11: -1,
//     12: -1,
//     13: -1,
//     14: -1,
//     15: -1,
//     16: -1,
//     17: -1,
//     18: -1,
//     19: -1,
//     20: -1,
//     21: -1,
//     22: -1,
//     23: -1,
//     24: -1
//   },
//   daysAgo: {
//     1: -1,
//     2: -1,
//     3: -1,
//     4: -1,
//     5: -1,
//     6: -1,
//     7: -1
//   },
//   weeksAgo: {
//     1: -1,
//     2: -1,
//     3: -1,
//     4: -1
//   },
//   monthsAgo: {
//     1: -1,
//     2: -1,
//     3: -1
//   }
// }
