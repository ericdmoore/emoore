import {
    minSteppedArray, 
    makeSteppedArray, 
    monthedSteppedArray
} from '../../../src/utils/ranges/time'

test('3 month range', ()=>{
    const start = 1628693747471
    const range = monthedSteppedArray(3, start)
    const startD = new Date(start)

    const arr = Array.from({length:3},(v,i)=>{
        const d = new Date(start)
        d.setMonth(startD.getMonth() - i)
        d.setHours(0,0,0,0)
        return d.getTime()
    }) 
    expect(range).toHaveLength(3)
    expect(range).toStrictEqual(arr)
})

test('Stepped Array', ()=>{
    const step = 10
    const start = 1628693747471
    const range = makeSteppedArray(step)(3, start)

    const arr = Array.from({length:3}, (_,i)=>{
        return start - (i * step)
    })

    expect(range).toHaveLength(3)
    expect(range).toStrictEqual(arr)
})

test('Minute Stepped Array', ()=>{
    const minutestep = 10
    const start = 1628693747471

    const range = minSteppedArray(minutestep)(3, start)
    const arr = Array.from({length:3}, (_,i)=>{
        return start - (i * minutestep * 1000 * 60)
    })

    expect(range).toHaveLength(3)
    expect(range).toStrictEqual(arr)
})