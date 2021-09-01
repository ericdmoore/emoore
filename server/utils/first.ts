export const first = <T>(arr:T[]) => arr.reduce((p, c) => p || c)
export const tryHead = <T, U>(arr:T[], ifMissing: U) => arr.length > 0 ? arr[0] : ifMissing

export default first
