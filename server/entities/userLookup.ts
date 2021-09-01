// import type * as k from '../types'
import { appTable } from './entities'
import { Entity } from 'dynamodb-toolbox'

// import type { LinkKind } from './entities'

export const userLookup = {
  pk: (i:{exID: string}) => `exid#${i.exID}`,
  sk: (i:{typeID:string}) => `t#${i.typeID}`,
  ent: new Entity({
    table: appTable,
    name: 'userLookup',
    timestamps: true,
    attributes: {
      uacct: { type: 'string' },
      exID: { type: 'string' },
      typeID: { type: 'string' },
      isIDVerified: { type: 'boolean' },
      verificationSentDT: { type: 'number' },
      //
      pk: { hidden: true, partitionKey: true, dependsOn: 'exID', default: (data:any) => userLookup.pk(data) },
      sk: { hidden: true, sortKey: true, dependsOn: 'typeID', default: (data:any) => userLookup.sk(data) }
    }
  })
}
