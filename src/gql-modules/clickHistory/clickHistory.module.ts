import { createModule, gql} from 'graphql-modules';
import {loadSchemaFromFsSync} from '../loadSchema'
import * as fs from 'fs'


export const clickHistModule = createModule({
  id: 'clickHistModule',
  dirname: __dirname,
  typeDefs: gql(loadSchemaFromFsSync(fs, 'clickHistory.graphql'))
});

export default clickHistModule

//#region interface 
type int = number
export interface PageInfo {
    hasNextPage: boolean
    hasPreviousPage: boolean
    endCursor: string
    startCursor: string
}

export interface ClickEventDuration {
    end: int
    duration: int
    internval: string
    start: int
    total: int
}

export interface  DurationEdge {
    cursor: string
    node: ClickEventDuration
}

export interface DurationConnection {
    edges: [DurationEdge]
    pageInfo: PageInfo
} 

export type getClickHistParams = {
    shortURL: string, 
    internval?: string, 
    first?: int,
    after?: string, 
    last?: int,
    before?: string
}

export interface Query {
    getClickHist(
        shortURL: string, 
        internval?: string, 
        first?: int,
        after?: string, 
        last?: int,
        before?: string
    ): DurationConnection
}

//#endregion interface 

/**
 * 
 * Duration --->
 * -----------------------------------------------
 * |interval.1|      |      |      |      |      |
 * -----------------------------------------------
 * 
 * supported intervals = 'm', 'h', 'd'
 * 
 * - hours
 */