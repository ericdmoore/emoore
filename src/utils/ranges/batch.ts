export const batch  = (n:number = 25) => function * <T>(iter: T[]){
    while(iter.length > 0){
        const next = iter.slice(0,n)
        yield next
        iter = iter.slice(n)
    }
}

export const asyncBatch  = (n:number = 25) => async function * <T>(iter: T[]){
    while(iter.length > 0){
        const next = iter.slice(0,n)
        yield next
        iter = iter.slice(n)
    }
}