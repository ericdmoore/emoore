import ksuid from 'ksuid'
import { appTable, epoch } from './entities'
import { Entity } from 'dynamodb-toolbox'
import type { DocumentClient } from 'aws-sdk/clients/dynamodb'

import geoip from 'fast-geoip'
import { IResult, UAParser } from 'ua-parser-js'
import { batch } from '../utils/ranges/batch'
import { addHours, addMonths, addDays, addWeeks } from 'date-fns'

const b25 = batch(25)

type Datish = number | string | Date
interface ipInfo {
  range: [number, number];
  country: string;
  region: string;
  eu: '0' | '1';
  timezone: string;
  city: string;
  ll: [number, number];
  metro: number;
  area: number;
}

export interface ClickInputs{
  short:string,
  long:string,
  ip: string,
  useragent: string
  geo?: ipInfo
  cts?: number | Date
  sk?: string
}

export interface IClick{
short: string
long: string
ip: string
cts: number
useragent: IResult
geo?: ipInfo
sk?: string
}

export type RemoveClickInputs = {short:string; sk:string} | {short:string; cts:number | Date}

type SKInputs = {cts: Datish }

type Dict<T> = {[key:string]:T}

export interface iClickEventRangeQuery{
  short: string
  start: number | Date
  stop: number | Date
}

export interface iClickEventByTimeDuration{
  short: string
  goBack: number
  start?: number
  stop?: number
}

export interface ClickPut{
  short: string
  long: string
  time: number
  ip?: string
  //
  geo: ipInfo | Dict<string>
  useragent: IResult
}

const uaparser = new UAParser()

const inputToSK = (i?: Datish):string => {
  switch (typeof i) {
    case 'number':
      return `tks#${ksuid.randomSync(i).string}`
    /* istanbul ignore next */
    case 'string':
      return `tks#${i}`
    /* istanbul ignore next */
    case 'undefined':
      return `tks#${ksuid.randomSync().string}`
    /* istanbul ignore next */
    default:
      return `tks#${ksuid.randomSync(i.getTime()).string}`
  }
}

export const click = {
  pk: (i: {short:string}) => `c#${i.short}`,
  sk: (i?: SKInputs) => inputToSK(i?.cts),
  synth: async (i:ClickInputs | IClick) => {
    const g = i.geo ? i.geo : await geoip.lookup(i.ip)
    const geo: ipInfo | undefined = g!! ? g : undefined

    return {
      ...i,
      geo,
      useragent: typeof i.useragent === 'string'
        ? uaparser.setUA(i.useragent).getResult()
        : i.useragent,
      cts: i.cts
        ? typeof i.cts === 'number'
          ? i.cts
          : i.cts.getTime()
        : Date.now()
    } as IClick
  },
  batch: {
    save: async (clickArr: (IClick | ClickInputs)[]) => {
      const clicks = await Promise.all(clickArr.map(c => click.synth(c)))

      if (clicks.length === 1) {
        await click.ent.put(await click.synth(clicks[0])) as Promise<DocumentClient.PutItemOutput>
      } else {
        const prepped = await click.batch.putPrep(clicks)
        // console.log('clicks.length', clicks.length)
        // console.log('preped', JSON.stringify(prepped,null, 2))

        for (const prepedClickPage of b25(prepped)) {
          await click.ent.table.batchWrite(prepedClickPage)
        }
      }
      return null
    },
    remove: async (clickArr: RemoveClickInputs[]) => {
      if (clickArr.length === 1) {
        const clickr = clickArr[0]
        // console.log({ clickr })
        let cts: number | undefined
        let sk: string | undefined
        if ('cts' in clickr) {
          const ctsD = clickr.cts
          cts = typeof ctsD === 'number' ? ctsD : ctsD.getTime()
          sk = undefined
        } else {
          cts = undefined
          sk = clickr.sk
        }
        const { short } = clickr

        await click.ent.delete({ cts, short, sk }) as Promise<DocumentClient.DeleteItemOutput>
      } else {
        // console.log({ clickArr })
        for (const readyToDeleteWriteReqs of b25(click.batch.rmPrep(clickArr))) {
          await click.ent.table.batchWrite(readyToDeleteWriteReqs)
        }
      }
      return null
    },
    putPrep: async (clickArr: (IClick | ClickInputs)[]) => {
      const preBuilt = clickArr.filter(c => typeof c.useragent !== 'string') as IClick[]
      const input = clickArr.filter(c => typeof c.useragent === 'string') as ClickInputs[]

      const builtClicks = await Promise.all(input.map(c => click.synth(c)))
      return builtClicks.concat(preBuilt).map(c => click.ent.putBatch(c))
    },
    rmPrep: (clickArr: RemoveClickInputs[]) => {
      return clickArr.map(c => {
        const cts = 'cts' in c ? typeof c.cts === 'number' ? c.cts : c.cts.getTime() : undefined
        const sk = 'sk' in c ? c.sk : undefined
        return click.ent.deleteBatch({ cts, sk, short: c.short })
      })
    }
  },
  query: {
    count: async (short:string, i?: Partial<{start:number, stop:number}>) => {
      // for the reasoning of `14e11`
      // @see (./node_modules/ksuid/index.js:8)
      // in short its used for 32 ranging a 32 byte BE structure around useful (136 year) date range based on when the codebase was created (2014) - aka warning in year 2150
      const start:number = i?.start ?? 14e11
      const stop:number = i?.stop ?? Date.now()
      // console.log({start, stop}, 'count:windowSize:', stop - start)

      return click.ent.table.query(
        click.pk({ short }),
        { between: [click.sk({ cts: start }), click.sk({ cts: stop })] },
        { Select: 'COUNT' }
      ) as DocumentClient.QueryOutput
    },
    usingRange: async (i:iClickEventRangeQuery) => {
      return appTable.query(
        click.pk(
          { short: i.short }),
        { between: [click.sk({ cts: i.start }), click.sk({ cts: i.stop })] }
      ) as DocumentClient.QueryOutput
    },
    last24Hrs: async (i:{short:string, stop?:number}) => {
      const stop = i.stop ?? Date.now()
      // console.log({start, stop}, '24hr:windowSize:', stop - start)
      return click.query.usingRange({
        short: i.short,
        start: addHours(stop, -24).getTime(),
        stop
      })
    },
    byDays: async (i:iClickEventByTimeDuration) => {
      const stop = i.stop ?? Date.now()

      // console.log({start, stop}, 'day:windowSize:', stop - start)

      return click.query.usingRange({
        short: i.short,
        start: addDays(stop, -i.goBack).getTime(),
        stop
      })
    },
    byWeeks: async (i:iClickEventByTimeDuration) => {
      const stop = i.stop ?? Date.now()

      // console.log({start, stop}, 'week:windowSize:', stop - start)

      return click.query.usingRange({
        short: i.short,
        start: addWeeks(stop, -i.goBack).getTime(),
        stop
      })
    },
    byMonths: async (i:iClickEventByTimeDuration) => {
      const stop = i.stop ?? Date.now()

      // console.log({start, stop}, 'month:windowSize:', stop - start)

      return click.query.usingRange({
        short: i.short,
        start: addMonths(stop, -i.goBack).getTime(),
        stop
      })
    }
  },
  ent: new Entity({
    table: appTable,
    name: 'click',
    timestamps: false,
    attributes: /* no custom ts since never MTS */{
      short: { type: 'string' },
      long: { type: 'string' },
      ip: { type: 'string' },
      geo: { type: 'map' },
      useragent: { type: 'map' },
      // needs no mts, since its an event collector
      cts: { type: 'number', onUpdate: false, default: epoch },
      pk: { hidden: false, partitionKey: true, dependsOn: 'short', default: (data:any) => click.pk(data) },
      /* istanbul ignore next */
      sk: { hidden: false, sortKey: true, dependsOn: 'cts', default: (data:any) => click.sk(data) }
    }
  }) // as Entity<ClickPut>
}
