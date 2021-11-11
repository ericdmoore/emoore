import { Entity } from 'dynamodb-toolbox'
import { appTable, customTimeStamps } from './entities'

import type { DocumentClient } from 'aws-sdk/clients/dynamodb'
import type { ILink } from './links'

// import type { LinkKind } from './entities'

export const userAccess = {
  pk: (i:{uacct: string}) => `u#${decodeURIComponent(i.uacct)}`,
  sk: (i:{short: string}) => `ac#${decodeURIComponent(i.short)}`,
  batch: {
    get: async (uacct: string, ...shorts:string[]) => appTable.batchGet(shorts.map(short => userAccess.batch.params.get({ uacct, short }))),
    put: async (...links:ILink[]) => appTable.batchWrite(links.map(l => userAccess.batch.params.put({ ...l, uacct: l.ownerUacct }))),
    params: {
      // typed entity aliases
      get: (i:{uacct: string, short:string}) => userAccess.ent.getBatch({ uacct: i.uacct, short: i.short }),
      put: (i:{short:string, long:string, uacct:string }) => userAccess.ent.putBatch({ short: i.short, long: i.long, uacct: i.uacct })
    }
  },
  query: {
    byUacct: (i:{uacct: string }) => appTable.query(userAccess.pk(i), { beginsWith: 'ac#' }) as Promise<DocumentClient.QueryOutput>
    // byUacctDates: (i:{uacct: string, start:number, end:number }) => { throw Error('Not Implemented Yet') }
  },
  ent: new Entity({
    table: appTable,
    name: 'userAccess',
    timestamps: false,
    attributes: customTimeStamps({
      uacct: { type: 'string' },
      short: { type: 'string' },
      //
      long: { type: 'string', required: true },
      role: { type: 'string' },
      displayName: { type: 'string' },
      pk: { hidden: true, partitionKey: true, dependsOn: 'uacct', default: (data:any) => userAccess.pk(data) },
      sk: { hidden: true, sortKey: true, dependsOn: 'short', default: (data:any) => userAccess.sk(data) }
    })
  })
}

export interface IUserAccess{
  uacct: string
  short: string
  long: string
  displayName?: string
  role?: string
  mts?: number
  cts?: number
}
