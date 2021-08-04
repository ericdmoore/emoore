import type { IFunc, SRet } from '../types'
export const handler = (verbFns: {
  get:IFunc, post:IFunc, put:IFunc, dele:IFunc
}):IFunc => async (e, c) => {
  switch (e.requestContext.http.method.toUpperCase().slice(0, 4)) {
    case 'GET':
      return verbFns.get(e, c) as Promise<SRet>

    case 'PUT':
      return verbFns.put(e, c) as Promise<SRet>

    case 'POST':
      return verbFns.post(e, c) as Promise<SRet>

    case 'DELE':
      return verbFns.dele(e, c) as Promise<SRet>

    default:
      return verbFns.get(e, c) as Promise<SRet>
  }
}
export default handler
