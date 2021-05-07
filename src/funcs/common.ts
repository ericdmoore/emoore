import type { IFunc, IFuncRetValue } from '../types'
export const handler = (verbFns: {get:IFunc, post:IFunc, put:IFunc, dele:IFunc}):IFunc => async (e, c) => {
  const method = e.requestContext.http.method.toLowerCase().slice(0, 4)
  console.log(__filename, e.requestContext.http.method.toLowerCase().slice(0, 4))
  let ret : IFuncRetValue
  switch (method) {
    case 'get':
      console.log('found a GET method')
      ret = verbFns.get(e, c)
      break
    case 'put':
      console.log('found a PUT method')
      ret = verbFns.put(e, c)
      break
    case 'post':
      console.log('found a POST method')
      ret = verbFns.post(e, c)
      break
    case 'dele':
      console.log('found a DEL method')
      ret = verbFns.dele(e, c)
      break
    default:
      console.log('unknown Method - defaulting to GET')
      ret = verbFns.get(e, c)
      break
  }

  console.log(await ret)
  return ret
}
export default handler
