// import type * as k from '../types'
import { appTable, customTimeStamps } from './entities'
import { Entity } from 'dynamodb-toolbox'
import type { DocumentClient } from 'aws-sdk/clients/dynamodb'

// import type { LinkKind } from './entities'

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
