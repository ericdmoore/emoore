import type {
  // eslint-disable-next-line no-unused-vars
  APIGatewayProxyHandlerV2 as Func,
  // eslint-disable-next-line no-unused-vars
  APIGatewayProxyEventV2 as Event,
  APIGatewayEventRequestContext as Context,
  // eslint-disable-next-line no-unused-vars
  APIGatewayProxyResultV2 as Ret,
  // eslint-disable-next-line no-unused-vars
  APIGatewayProxyStructuredResultV2
} from 'aws-lambda'

import type { FilterExpressions } from 'dynamodb-toolbox/dist/lib/expressionBuilder'
import type { ProjectionAttributes } from 'dynamodb-toolbox/dist/lib/projectionBuilder'
import type { DocumentClient } from 'aws-sdk/clients/dynamodb'
import type { Table } from 'dynamodb-toolbox'

export type Responder<T> = (Data:T, event: Event, context: Context)=> Promise<Ret>
export type TableType<T> = T & { pk:string; sk:string }
export type WithTimeStamp<T> = T & { cts:number; mts:number }
export type Evt = Event
export type Ctx = Context
export type SRet = APIGatewayProxyStructuredResultV2
export type IFuncRetValueP = Promise<string | object | SRet| undefined>
export type IFunc = (event: Event, context: Context & {nextToken?: string, dataPayload?:unknown}) => IFuncRetValueP
export interface RequestRejection{
    reason: string
    message: string
    documentationRef: string
}
export type Rejector = (reasons:RequestRejection[]) => IFunc
export type Validator = (nextIfPass:IFunc) => IFunc
export interface JWTObject{
    email: string
    uacct?: string
    maxl25?: string[]
}
export interface toolboxGetOptions {
    consistent?: boolean;
    capacity?: DocumentClient.ReturnConsumedCapacity;
    attributes?: ProjectionAttributes;
    include?: string[];
    execute?: boolean;
    parse?: boolean;
}
export interface toolboxDeleteOptions {
    conditions?: FilterExpressions;
    capacity?: DocumentClient.ReturnConsumedCapacity;
    metrics?: DocumentClient.ReturnItemCollectionMetrics;
    returnValues?: DocumentClient.ReturnValue;
    include?: string[];
    execute?: boolean;
    parse?: boolean;
}
export interface transactionOptions {
    conditions?: FilterExpressions;
    returnValues?: DocumentClient.ReturnValuesOnConditionCheckFailure;
}
export interface toolboxPutOptions {
    conditions?: FilterExpressions;
    capacity?: DocumentClient.ReturnConsumedCapacity;
    metrics?: DocumentClient.ReturnItemCollectionMetrics;
    returnValues?: DocumentClient.ReturnValue;
    include?: string[];
    execute?: boolean;
    parse?: boolean;
}

export declare type ToolboxSchemaType = string | number | boolean | null | {
    [key: string]: ToolboxSchemaType;
} | ToolboxSchemaType[];

export type TypedEntity<GetType, PutType> = {
    get: (i: GetType, options?: toolboxGetOptions, params?: Partial<DocumentClient.GetItemInput>) => Promise<TableType<WithTimeStamp<Required<GetType>>>>,
    put: (full: PutType, options?: toolboxPutOptions, params?: Partial<DocumentClient.PutItemInput>) => Promise<TableType<WithTimeStamp<Required<PutType>>>>,
    getBatch: (i: GetType)=> {Key:unknown, Table:Table}
    putBatch: (i: PutType)=> {[key: string]: DocumentClient.WriteRequest}
    getTransaction: ()=> { Entity: unknown } & DocumentClient.TransactGetItem;
    putTransaction: ()=> {'Put': DocumentClient.Put}
}
