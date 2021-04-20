import { readFile } from "fs"
import { promisify } from 'util'
import { resolve } from 'path'

const readFileP = promisify(readFile)

export const Query = {
    linkPeek : function(): Link {
        console.log(arguments)
        return {
            long:'',
            short:'',
            createdByUser:'',
            createdDate:123, 
            modfiedDate:123
        }
    },
    linkClickHistory : function(): ClickConnection {
        console.log(arguments)
        return {
            pageInfo:{
                hasNextPage:false, 
                hasPreviousPage: false, 
                endCursor:'eC',
                startCursor:'sC'
            },
            edges:[{
                cursor:'c1',
                node: [
                    {
                        date:123, 
                        userAgentRaw:'', 
                        pIsBot:0.1, 
                        geosFromIP:[],
                        ua:{
                            deviceCpuArch: '',
                            deviceModel:'', 
                            deviceOs:'', 
                            browserEngine:'',
                            browserEngineVersion:'',
                            browserName:'',
                            browserVersion:'',
                            deviceOsVersion:'', 
                            deviceType:'CONSOLE'
                        }
                    }
                ]
            }]
        }
    },
    linkClickCounts: function(): CountedClickConnection{
        console.log(arguments)
        return {
            pageInfo:{
                hasNextPage:false, 
                hasPreviousPage: false, 
                endCursor:'eC',
                startCursor:'sC'
            },
            edges:[
                {
                    cursor:'c1', 
                    node:{
                        bucketID:'bID.1', 
                        bucketResolution: 'DAY',
                        totalCount:2
                    }
                },
                {
                    cursor:'c2', 
                    node:{
                        bucketID:'bID.2', 
                        bucketResolution: 'DAY',
                        totalCount:3 
                    }
                }
            ],            
        }
    },
    linkGeoHistory: function(): Geo[] {
        return [
            {regionType:'', value:''},
            {regionType:'', value:''}
        ]
    },
}

export const Mutation = {
    linkExpand : function(): Link {
        return {
            long: '',
            short: '',
            createdByUser: '',
            createdDate: 123,
            modfiedDate: 123
        }
    },
    linkCreate : function(): [Link] {
        return [{
            long: '',
            short: '',
            createdByUser: '',
            createdDate: 123,
            modfiedDate: 123
        }]
    }
}

export const Schema = readFileP(resolve(__dirname, './link.graphql'))
                            .then(d => d.toString())

export default {Query, Mutation, Schema}

// #region interfaces 

interface PageInfo{
    hasNextPage: boolean
    hasPreviousPage: boolean
    startCursor: string
    endCursor: string
}

type TimeResolution = 
| 'DAY'
| 'HOUR'
| 'MINUTE'
| 'MONTH'
| 'YEAR'


type DeviceFormFactor = 
| 'CONSOLE'
| 'EMBEDED'
| 'MOBILE'
| 'SMARTTV'
| 'TABLET'
| 'WEARABLE'


interface Geo{
    regionType: string
    value: string
}

interface CountedClicks{
    bucketID: string
    bucketResolution: TimeResolution
    totalCount: number
}

interface Click{
    date: number
    geosFromIP: Geo[]
    pIsBot: number
    ua: UA
    userAgentRaw: string
}

interface Link {
    short:ID
    long: string
    createdByUser?: string    
    createdDate?: number
    modfiedDate?: number
}

interface UA{
    browserName?: string    
    browserVersion?: string
    browserEngine?: string
    browserEngineVersion?: string
    deviceCpuArch?: string
    deviceModel?: string
    deviceOs?: string
    deviceOsVersion?: string  
    deviceType?: DeviceFormFactor
}

interface CountedClickEdge{
    cursor: string
    node: CountedClicks
}

interface ClickConnection{
    edges: ClickEdge[]
    pageInfo: PageInfo
}

interface ClickEdge{
    node: Click[]
    cursor: string
}

interface CountedClickConnection{
    edges: CountedClickEdge[]
    pageInfo:PageInfo
}

type ID = number | string

// #endregion interfaces