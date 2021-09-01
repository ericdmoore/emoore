/**
 * to Base64
 * @param ascii
 */
// eslint-disable-next-line no-unused-vars
export const atob = (ascii:string) => Buffer.from(ascii, 'utf-8').toString('base64')

/**
 * to Regular Encoding (Ascii-ish)
 * @param base64
 */
export const btoa = (base64:string) => Buffer.from(base64, 'base64').toString('utf-8')

export default { btoa, atob }
