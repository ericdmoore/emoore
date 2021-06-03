import type { IFunc } from '../types'
export const handler = (verbFns: {get:IFunc, post:IFunc, put:IFunc, dele:IFunc}):IFunc => async (e, c) => {
  const method = e.requestContext.http.method.toUpperCase().slice(0, 4)

  switch (method) {
    case 'GET':
      // console.log('found a GET method')
      return verbFns.get(e, c)

    case 'PUT':
      // console.log('found a PUT method')
      return verbFns.put(e, c)

    case 'POST':
      // console.log('found a POST method')
      return verbFns.post(e, c)

    case 'DELE':
      // console.log('found a DEL method')
      return verbFns.dele(e, c)

    default:
      // console.log('unknown Method - defaulting to GET')
      return verbFns.get(e, c)
  }
}
export default handler
