export function * chunky <T> (data: Array<T>, chunkSize = 25) {
  for (let i = chunkSize; data.length > 0; i += chunkSize) {
    const ret = data.slice(0, chunkSize) // 0,25 | 25
    data = data.slice(chunkSize)
    yield ret
  }
  return null
}

type FnArrTransforms <T, U> = (i:T[]) => Promise<U[]>
type FnArrReducer <Input, Output> = (prior:Output, arr:Input[], i: number) => Promise<Output>

export const collectMappedChunks = async <T, U>(data: Array<T>, mapper?: FnArrTransforms<T, U>) : Promise<U[]> => {
  if (!mapper) mapper = async (i) => i as unknown as U[]

  let acc = [] as U[]
  for (const chnk of chunky(data)) {
    acc = acc.concat(await mapper(chnk))
  }
  return acc
}

export const chunkReduce = async <Input, Middle, Output>(
  data: Array<Input>,
  init: Output | Promise<Output>,
  mapper: FnArrTransforms<Input, Middle>,
  reducer: FnArrReducer<Middle, Output>
) : Promise<Output> => {
  const i = 0
  for (const chnk of chunky(data)) {
    init = await reducer(await init, await mapper(chnk), i)
  }
  return init
}

export default chunky
