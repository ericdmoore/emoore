import type {AppSyncResolverHandler, AppSyncResolverEvent} from 'aws-lambda'
import type {getClickHistParams} from '../gql-modules/clickHistory/clickHistory.module'

export const getClickHist:IHandleGetClickHist = async (event, ctx, cb) => {
    console.log({ event, ctx })
    
    // event.request.headers
    // event.arguments.info.

    return {allo:'world'}
}

//#region interfaces
type IHandleGetClickHist = AppSyncResolverHandler<
    AppSyncResolverEvent<IGetClickHistoryEVENT>, IGetClickHistoryRETURN
>
type IGetClickHistoryEVENT = getClickHistParams
interface IGetClickHistoryRETURN{
    allo: string 
}
//#endregion interfaces