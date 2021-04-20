import type {AppSyncResolverHandler, AppSyncResolverEvent} from 'aws-lambda'
// import type {} from '../gql-modules/link-module'
// import {Lam} from '@aws-cdk/'

export const getRandURL:IHandleGetClickHist = async (event, ctx) => {
    console.log({ event, ctx })
    return {url:`https://example.com/#${Date.now()}`}
}


//#region interfaces

type IHandleGetClickHist = AppSyncResolverHandler<AppSyncResolverEvent<IGetClickHistoryEVENT>, IGetClickHistoryRETURN>
interface IGetClickHistoryEVENT{
    url: string 
}

interface IGetClickHistoryRETURN{
    url: string 
}
//#endregion interfaces