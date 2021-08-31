/**
 * ### Date Formatter
 * @description Given a format string, the formatter does simple replacment for date string tokens.
 * @param fmt - format String
 * @param epoch - 13 digit Epoch Date number
 *
 * @token `YYYY`:Year; ex: 2021
 * @token `YY`:AbbrevYear; 21
 * @token `MM`:Month; 04 [01-12]
 * @token `DD`:Date; 01 [01-31]
 * @token `HH`:24 Hours; 13 [00-23]
 * @token `%H`:Am/pm Hours; 01 [01-12]
 * @token `hh`:Am/pm Hours; 01pm
 * @token `mm`:minutes; 59
 * @token `ss`:seconds; 42
 * @token `qhr`:quaterHourBlock; a
 * @example
 * ```js
 * fmtDate('YYYYMMDDhhmmmsss')(Date.now()) // '2021040801pm27m59s'
 * ```
 */
export const dateFmt = (fmt:string = 'YYYYMMDDHH') => {
  const p2 = (s:string) => s.padStart(2, '0')
  const quaterHrChars = ['a', 'b', 'c', 'd']
  const tenMinBlockChars = ['0', '1', '2', '3', '4', '5']
  return (epoch:number) => {
    if(fmt ==='AllTime'){
      return '_all'
    }
    const d = new Date(epoch)
    const YYYY = d.getUTCFullYear().toString()
    const YY = p2(d.getUTCFullYear().toString().slice(-2))
    const MM = p2((d.getUTCMonth() + 1).toString())
    const DD = p2(d.getUTCDate().toString())
    const HH = p2(d.getUTCHours().toString())
    const mm = p2(d.getUTCMinutes().toString())
    const ss = p2(d.getUTCSeconds().toString())
    const qhr = quaterHrChars[Math.floor(d.getUTCMinutes() / 15)]
    const tmb = tenMinBlockChars[Math.floor(d.getUTCMinutes() / 10)]
    const H = p2((d.getUTCHours() % 12).toString())
    const ampm = d.getUTCHours() > 11 ? 'pm' : 'am'
    const hh = `${H}${ampm}`

    return fmt
      .replace('YYYY', YYYY)
      .replace('ampm', ampm)
      .replace('YY', YY)
      .replace('MM', MM)
      .replace('DD', DD)
      .replace('HH', HH)
      .replace('%H', H)
      .replace('hh', hh)
      .replace('qhr', qhr)
      .replace('tmb', tmb)
      .replace('mm', mm)
      .replace('ss', ss)
  }
}

export const fmtDate = dateFmt('YYYYMMDD')
export const fmtDateHrs = dateFmt('YYYYMMDDHH')
export const fmtDateTmb = dateFmt('YYYYMMDDHHtmb')
export const fmtDateQhr = dateFmt('YYYYMMDDHHqhr')
export const fmtDateMins = dateFmt('YYYYMMDDHHmm')

export default dateFmt
export type ITimeUnts = 'Years' | 'Months' | 'Days' | 'Hours' | 'Minutes' | 'Seconds' | 'Milliseconds'
