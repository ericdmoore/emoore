// #region interfaces
type PromiseOr<T> = Promise<T> | T
type DictUnknowns = {[str:string]:unknown}
// type JsonTypes = null | string | number | boolean | JsonTypes[] | {[key:string]:JsonTypes}
// #endregion interfaces

const { isArray } = Array

const isPrim = (i:unknown) => {
  const types = ['string', 'number', 'boolean', 'function', 'undefined', 'bigint', 'symbol']
  // eslint-disable-next-line valid-typeof
  return types.some(tStr => typeof i === tStr)
}

const isObject = (i:unknown) : i is {[s:string]:unknown} => {
  return !isPrim(i) && !isArray(i)
}

/**
 *
 * @param promisedInputObj
 */
const resObj = async (promisedInputObj: PromiseOr<DictUnknowns>): Promise<DictUnknowns> => {
  const resolvedInput = await promisedInputObj

  const keys = Object.keys(resolvedInput)
  const vals = await Promise.all(Object.values(resolvedInput))

  return vals.reduce(async (prior:Promise<DictUnknowns>, val, i) => ({
    ...(await prior),
    [keys[i]]: isObject(val)
      ? await resObj(val as PromiseOr<DictUnknowns>)
      : val
  }), Promise.resolve({}) as Promise<DictUnknowns>)
}
export default resObj
