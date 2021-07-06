// npx ts-node tools/linecount.ts 
import type {PlotConfig} from 'asciichart'

import {readFile} from 'fs'
import {resolve} from 'path'
import {promisify} from 'util'

import globby from 'globby'
import {plot} from 'asciichart'
import boxen from 'boxen'
import getopts from "getopts"

const options = getopts(process.argv.slice(2), {
  default:{
    glob: [`!${resolve(__dirname,'*.d.ts')}`, resolve(__dirname, '../src/**/*.ts') ],
    line: true,
    char: false, 
    help: false,
    verbose: false
  },
  alias: {
    glob: ['g'],
    line: ['l'],
    char: ['c'],
    help: ['h'],
    verbose: ['v']
  },
  boolean:['help', 'verbose', 'char', 'line']
})

options.glob = Array.isArray(options.glob) 
    ? options.glob as string[]
    : (options.glob as unknown as string).split(',').map(g => resolve(__dirname,g)) as string[]

options.usingDashedFiles = options._.length > 0
/**
 * -g --globs = 
 */


const readFileP = promisify(readFile)
const asc = (smallest:number, highest:number) => smallest - highest
const desc = (smallest:number, highest:number) =>  highest - smallest

/** 
 * This bin naked numbers
 * @question should we add a ƒn for binning named numbers?
 * where we would retain the name of the: min, & max of each bin?
 * @param dataArr 
 * @param bins 
 * @returns 
 */
const bin = (dataArr:number[], bins:IBinConfig = {count:12}):IBin[]=>{
    // const min = Math.min(...dataArr)
    const max = Math.max(...dataArr)
    const range = max
    const localArr = [...dataArr].sort(asc)

    const bucketSize  = 'count' in bins 
        ? Math.ceil( range / bins.count) 
        : bins.size
    
    const bucketNum = 'count' in bins 
        ? bins.count
        : Math.ceil(range / bins.size)

    const init = Array(bucketNum).fill(0).map((_,i)=>({
        start : i * bucketSize + 1,
        stop: bucketSize + (i * bucketSize),
        count:0
        })
    ) as {start:number, stop:number, count:number}[]

    const ret = localArr.reduce((p,c,i)=>{
        p[Math.floor(c / bucketSize)].count++
        return p
    }, init )
    
    return ret
}

const topK = (k:number)=>(obj:Dict<number>):Dict<number>=>{
    return Object.entries(obj)
    .sort(([,av], [,zv])=>zv-av)
    .slice(0,k)
    .reduce((p,[k,v])=>({...p,[k]:v}),{} as Dict<number>)
}

const top10 = topK(10)

const fillAsciiStrWithData = (
        maxLen :number,  
        data:{min:number, q1:number, median:number, avg:number, q3:number, max:number, upperOutliers:number[]}, 
        symbols = '*-[=|]'.split('')
    )=>{
    const scale = maxLen / data.max
    const iqr = data.q3-data.q1
    const lowTailIdx = Math.round(scale * ( data.median - (1.5 * iqr)))
    const q1Idx = Math.round(scale * data.q1)
    const medIdx = Math.round(scale * data.median) 
    const q3Idx = Math.round(scale * data.q3)
    const upOutsIdxes = data.upperOutliers.map(out => Math.round(scale * out))

    const hiTailIdx = Math.round(scale * ( data.median + (1.5 * iqr)))
    const box = Array(maxLen).fill(' ') as string[]
    const axis = Array(maxLen).fill(' ') as string[]

    // draw-tails
    for(let i = lowTailIdx; i <q1Idx; i++){
        box[i] = symbols[1]
    }
    for(let i = q3Idx + 1; i <= hiTailIdx; i++){
        box[i] = symbols[1]
    }

    // fill q box
    for(let i = q1Idx + 1; i <medIdx; i++){
        box[i] = symbols[3]
    }
    for(let i = medIdx + 1; i < q3Idx; i++){
        box[i] = symbols[3]
    }

    // places some outliers
    for(const idx of upOutsIdxes){
        box[idx] = symbols[0]
    }
    axis[upOutsIdxes.slice(-1)[0]] = data.upperOutliers.slice(-1)[0].toString()

    box[q1Idx] = symbols[2]
    axis[q1Idx]= data.q1.toString()

    box[medIdx] = symbols[4]
    axis[medIdx]= data.median.toString()

    box[q3Idx] = symbols[5]
    axis[q3Idx]= data.q3.toString()

    return { box: box.join(''),
            axis: axis.join('') }
}

const makeBoxPlot = (series:number[], cfg = {maxLen:80})=>{    
    const localNums = [...series].sort(asc)
    const min = Math.min(...localNums)
    const max = Math.max(...localNums)
    const totalLOC = series.reduce((p,c)=>p+c,0)
    const avg = Math.round(localNums.reduce((p,c)=>p+c,0) / localNums.length)
    const median = localNums[ Math.round(localNums.length / 2 )]
    
    const q = Math.round(localNums.length / 4)
    const q1 = localNums[q]
    const q3 = localNums[q*3]
    const upperOutliers = localNums
        .slice(0,-1)
        .filter(v=> v > median + (1.5*(q3 - q1)))
        .slice(0,2)
    // const iqr = q3 - q1
    const {box, axis} = fillAsciiStrWithData(cfg.maxLen,{ min, q1, median, avg, q3, max, upperOutliers })// chagnes output
    console.table({ min, q1, median, avg, q3, max, N: localNums.length, totalLOC })
    console.log(boxen(box+'\n'+axis,{padding:0}))
    return { min, q1, median, avg, q3, max, N: localNums.length, totalLOC, box, axis }
}

const histogramPlot = (title:string, series:number[], bins:IBinConfig = {count:12}, plotCfg: PlotConfig)=>{
    console.log(title)
    console.log(    
        plot(
            bin( series, bins ).map(v=>v.count), 
            plotCfg
        )
    )
}

;(async ()=>{
    if(options.help){
        console.log(`
    Line Count: by Eric D Moore © 2021

    --help -h = help input
    --char -c = char input
    --line -l = line input
    --verbose -v = verbose input
    --glob -g = glob input are relative to the locaiton of this file. 
        input format: ../path1/**/*.ts,../path2/*.ts // notice the comma separated values
        Default : [__dirname../src/**/*.ts]
        Assumes the file is located in a sister folder next to src
    -- {postDash} a space separated array of file paths, the OS will often expand glob patterns on your behalf
        @See Example:B
        
    Examples:
        A> npx ts-node tools/linecount.ts 
        B> npx ts-node tools/linecount.ts -v -- src/**/*.ts
        C> npx ts-node tools/linecount.ts -v  -g"../src/**/*.ts,../node_modules/**/*.ts"
    `)
    } else {
        const {_, ...opt} = options
        options.v && console.log({options: opt})
        
        const files = options._.length > 0 ? options._ : await globby(options.glob ,{concurrency:4, extglob: true})
        options.v && console.log({files})

        const linesPerFile = await files.reduce( async (p,f) => {
            return { ...await p, [f]: (await readFileP(f)).toString('utf-8').split('\n') }
        },
        Promise.resolve({}) as Promise<{[s:string]: string[]}>)

        const fileLineCount = Object.entries(linesPerFile)
            .reduce((p,[file, lineArr])=>({ ...p, [file]:lineArr.length}),{} as Dict<number>)

        const fileCharCount = Object.entries(linesPerFile)
            .reduce((p,[file, lineArr])=>({ 
                ...p, 
                [file]: lineArr.reduce((p,c)=>p+c.length,0) 
            }),{} as Dict<number>) 

        const lineCounts = Object.values(fileLineCount)
        const charCounts = Object.values(fileCharCount)
        // console.log(lineCounts)
        // console.log(plot(lineCounts, {height:5})) // does not print well since its 1000s wide

        if(options.line){
            console.log('LineCount Stats:')
            makeBoxPlot(lineCounts)
            histogramPlot('---------------\nLine Histogram\n',lineCounts, {count:25}, {height:6})
            console.log('\nlines - top 10:',top10(fileLineCount))    
        }
        if(options.char){
            console.log('CharCount Stats:') 
            makeBoxPlot(charCounts)
            histogramPlot('---------------\nChar Hist\n', charCounts, {count:25}, {height:6})
        }
    }
})()

type Dict<T> = {[s:string]:T}
interface IBinConfigCounted {count: number}
interface IBinConfigSized {size: number}
type IBinConfig  = IBinConfigCounted | IBinConfigSized

interface IBin{
    start:number
    stop:number
    count:number
}