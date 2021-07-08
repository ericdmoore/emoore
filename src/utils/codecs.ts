import * as t from 'io-ts'
export const possible = <A,O>(codec: t.Type<A,O,unknown>)=> t.union([t.undefined, codec])

// export const arrayTyped = <A,O>(codecParams: Dict<t.Type<A,O,unknown>>)=> t.array(t.type(codecParams))
// type Dict<T> = {[key:string]:T}