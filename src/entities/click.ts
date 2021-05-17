import ksuid from 'ksuid'
import { appTable, epoch } from './entities'
import { Entity } from 'dynamodb-toolbox'
import type { DocumentClient } from 'aws-sdk/clients/dynamodb'
import type { ClickPut, iClickEventRangeQuery } from './entities'

export const click = {
  pk: (i:{short:string}) => `c#${i.short}`,
  sk: (i:{ts:number}) => `tks#${ksuid.randomSync(i.ts).string}`,
  queryRange: async (i:iClickEventRangeQuery) => appTable.query(click.pk({ short: i.short }), { between: [click.sk({ ts: i.tsLo }), click.sk({ ts: i.tsHi })] }) as Promise<DocumentClient.QueryOutput>,
  ent: new Entity({
    table: appTable,
    name: 'click',
    timestamps: false,
    attributes: /* no custom ts since never MTS */{
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
