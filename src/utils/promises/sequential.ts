export const serialP = async <T>( arr: Promise<T>[] ): Promise<T> => {
    let latestP: T | null = null
    for(const p of arr){ 
        latestP = await p 
    }
    return latestP as T
}

export default serialP