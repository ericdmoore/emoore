import type { Evt } from '../types'
/**
 * ## Pluck Data For KeyString
 *
 * `Headers > QueryString > Cookies`
 * @param key
 */
export const pluckDataFor = (key:string) => <T>(e:Evt, ifMissing: T): string | T => {
  const ret = e.headers?.[key] ??
    e.queryStringParameters?.[key] ??
    e.cookies?.filter(c => c.startsWith(`${key}=`))[0].slice(`${key}=`.length)
  return ret ? decodeURIComponent(ret) : ifMissing
}
export default pluckDataFor
