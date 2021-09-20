// import handler from '../../src/funcs/expand'
import ms from 'ms'
import {saveExpandEvent, getLinkHistory, caughtError} from '../../server/entities/linkClickBy'
import type {ExpandLinkHistory} from '../../server/entities/linkClickBy'
import {batch, asyncBatch} from '../../server/utils/ranges/batch'
import { appTable } from '../../server/entities'
import seriesP from '../../server/utils/promises/sequential'
// import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'

const docClient = new DocumentClient()

const randBetween = (lo: number, hi:number) => Math.random() * (hi - lo) + lo
const batcher = batch(25)
// const batchedAsync = asyncBatch(3)

const spreadClicksOverTime = (short:string, long:string) => 
    async (clickNum:number, clicksPer:number, spread:{start:number, stop:number}) => {

        const genUpdateData = Array.from({length: clickNum},
            () => randBetween(spread.start, spread.stop)
        ).sort((a,z)=>a-z)
        
        for(const d of genUpdateData){
            const r = await saveExpandEvent(short, long, d, clicksPer).updateIndexes()
            // console.log(r)
        }
        return genUpdateData.map(d=>saveExpandEvent(short, long, d, clicksPer).updateParams).flat(1)
    }

const sumUpClicks = (clicksAgo : Dict<number>)=>Object.entries(clicksAgo).reduce((p,[k,count])=> count + p, 0)

describe('Test Harness to Deal with Click Events',()=>{   
    const nowish = (new Date()).setHours(0,0,0,0)
    // hrs:24, days:28, wks:4, mnth:3
    //
    // add 24 clicks to [now,1-];
    // add 24*6 clicks to days [1+,-7]
    // add 24*21 clicks to days [7+,28-]
    const links = [
        {short:'exHistorical1', long:'https://ericdmoore.com', hoursAgo:{total:1 * 24}, daysAgo:{total:1 * 24 * 7}, weeksAgo:{total:1 * 24 * 7 * 4} },
        // {short:'exHistorical2', long:'https://ericdmoore.com', hoursAgo:{total:2 * 24}, daysAgo:{total:2 * 24 * 7}, weeksAgo:{total:2 * 24 * 7 * 4} },
        // {short:'exHistorical3', long:'https://ericdmoore.com', hoursAgo:{total:3 * 24}, daysAgo:{total:3 * 24 * 7}, weeksAgo:{total:3 * 24 * 7 * 4} },
        // {short:'exHistorical4', long:'https://ericdmoore.com', hoursAgo:{total:4 * 24}, daysAgo:{total:4 * 24 * 7}, weeksAgo:{total:4 * 24 * 7 * 4} },
    ]

    beforeAll( async () => {
        const daysAgo1 = nowish - ms('24h')
        const daysAgo7 = nowish - ms('7d')
        const daysAgo28 = nowish - ms('28d')

        await seriesP(links.map( (l,i) => spreadClicksOverTime(l.short, l.long)( (i+1)*24, (i+1), {start: nowish, stop: daysAgo1}) )) //hrsAgo
        // await Promise.all(links.map( (l,i) => spreadClicksOverTime(l.short, l.long)( (i+1)*24*6, (i+1), {start: daysAgo1, stop: daysAgo7}) )) //daysAgo
        // await Promise.all(links.map( (l,i) => spreadClicksOverTime(l.short, l.long)( (i+1)*24*21, (i+1), {start: daysAgo7, stop: daysAgo28} ) )) //weeksAgo

    },20_000)

    // afterAll(async()=>{})

    // test('verifes Setup', ()=>{
    //     expect(1).toEqual(1)
    // })

    test('Make an event for this link', async () => {
        const l = links[0]
        const r = saveExpandEvent(l.short, l.long, nowish - 1000, 1 ).updateParams
        expect(r).toHaveLength(7)
    })  
    
    test.skip('Link History for this link0', async () =>{
        const {short} = links[0]
        const r = await getLinkHistory(short).catch(er=> {console.error(er); return caughtError } )
        console.log( r )
        
        expect(r).toHaveProperty('allTimeExpansions')
        expect(typeof r.allTimeExpansions).toEqual('number')
         
        expect(r).toHaveProperty('lastClick')
        expect(typeof r.lastClick).toEqual('number')

        expect(r).toHaveProperty('maxElapsedBetweenClicks')
 
        expect(r).toHaveProperty('hoursAgo')
        expect(sumUpClicks(r.hoursAgo)).toEqual(24)
        
        expect(r).toHaveProperty('daysAgo')
        expect(sumUpClicks(r.daysAgo)).toEqual(24 * 7)

        expect(r).toHaveProperty('weeksAgo')
        expect(sumUpClicks(r.weeksAgo)).toEqual(24 * 28)

        expect(r).toHaveProperty('monthsAgo')
    })

    test.skip('How many cliks for this link1', async()=>{})
    test.skip('How many cliks for this link2', async()=>{})


    test.todo('lines: 54')
    test.todo('lines: 71-78')
    test.todo('lines: 139')
    test.todo('lines: 145-158')

})


type Dict<T> = {[str:string]:T}