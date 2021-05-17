
import type * as k from '../types'
import { appTable, customTimeStamps } from './entities'
import { Entity } from 'dynamodb-toolbox'
import type { DocumentClient } from 'aws-sdk/clients/dynamodb'
import type { LinkKind } from './entities'

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
