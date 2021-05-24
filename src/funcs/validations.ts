import { HttpStatusCode } from '../enums/HTTPstatusCodes'
import type { IFunc, SRet, Evt, Ctx, IFuncRetValueP } from '../types'

interface ValidationResp{
  code: number
  reason: string
  passed:boolean
  InvalidDataLoc?: string
  InvalidDataVal?: string
  docRef?: string
}
export type ValidationTest<T> = (event:Evt, context: Ctx, authZData: T) => Promise<ValidationResp>

export const validate = <T>(responder: (authZData:T, e:Evt, c:Ctx)=>IFuncRetValueP, authZData: T, ...tests:ValidationTest<T>[]) : IFunc => async (event, context) => {
  const errors = (await Promise.all(tests.map(t => t(event, context, authZData))))
    .filter(t => !t.passed)
    .map(t => { const { passed, ...data } = t; return data })

  if (errors.length) {
    return {
      statusCode: HttpStatusCode.BAD_REQUEST,
      body: JSON.stringify({ errors })
    } as SRet
  } else {
    return responder(authZData, event, context)
  }
}

export default validate
