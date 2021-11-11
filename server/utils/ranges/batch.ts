export const batch = (n:number = 25) => function * <T>(iter: T[]) {
  let i = 0
  while (i < iter.length) {
    const next = iter.slice(i, i + n)
    yield next
    i = i + n
  }
}

export const asyncBatch = (n:number = 25) => async function * <T>(iter: T[]) {
  let i = 0
  while (iter.length > 0) {
    const next = iter.slice(i, i + n)
    yield next
    i = i + n
  }
}
