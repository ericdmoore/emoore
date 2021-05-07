import { HttpStatusCode } from '../enums/HTTPstatusCodes'
import type { IFunc, SRet, Evt, Ctx, IFuncRetValue } from '../types'

interface ValidationResp{
  code: number
  reason: string
  passed:boolean
  InvalidDataLoc?: string
  InvalidDataVal?: string
  docRef?: string
}
type ValidationTests<T> = (event:Evt, context: Ctx, comparisonData: T) => Promise<ValidationResp>

export const validate = <T>(responder: (compData:T, e:Evt, c:Ctx)=>IFuncRetValue, comparisonData: T, ...tests:ValidationTests<T>[]) : IFunc => async (event, context) => {
  const failures = (await Promise.all(tests.map(t => t(event, context, comparisonData))))
    .filter(t => !t.passed)
    .map(t => { const { passed, ...data } = t; return data })

  if (failures.length) {
    return {
      statusCode: HttpStatusCode.BAD_REQUEST,
      body: JSON.stringify({ failures })
    } as SRet
  } else {
    return responder(comparisonData, event, context)
  }
}

export default validate
