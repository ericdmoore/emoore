import type {AppSyncResolverHandler, AppSyncResolverEvent} from 'aws-lambda'
// import type {} from '../gql-modules/link-module'
// import {Lam} from '@aws-cdk/'

export const getClickHist:IHandleGetClickHist = async (event, ctx, cb) => {
    console.log({ event, ctx })
    return {allo:'world'}
}

export const hasShortURL:IHandleHasShortURL =  async (event, ctx, cb)=>{
    console.log('event:', event)
    console.log('ctx:', ctx)
    return false
}

//#region interfaces

type IHandleHasShortURL = AppSyncResolverHandler<AppSyncResolverEvent<IHasShortURLEVENT>, IHasShortURLRETURN>
interface IHasShortURLEVENT{longURL:string}
type IHasShortURLRETURN = boolean

type IHandleGetClickHist = AppSyncResolverHandler<AppSyncResolverEvent<IGetClickHistoryEVENT>, IGetClickHistoryRETURN>
interface IGetClickHistoryEVENT{ hey?: string }
interface IGetClickHistoryRETURN{ allo: string }
//#endregion interfaces