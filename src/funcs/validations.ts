import { HttpStatusCode } from '../enums/HTTPstatusCodes'
import type { IFunc, SRet, Evt, Ctx, Responder, NonNullObj } from '../types'

export interface ValidationResp{
  code: number
  reason: string
  passed:boolean
  InvalidDataLoc?: string
  InvalidDataVal?: string
  docRef?: string
}
// the plain 'true' values are for conditional logic where one branch of a conditional passes - and the other side does not
// this way the passing side can return true
export type ValidationTest<T> = (event:Evt, context: Ctx, authZData: T) => Promise<ValidationResp | true>

/**
 * @notes feels like it needs two types, the dirty input, and clearned normalized output
 * the dirty input might just be Partial<T>
 * Where the responder(happy path gets the CLEAN.OUTPUT type)
 * & the dirry input is the input for all the validation functions
 * @param responder
 * @param authZData
 * @param tests
 * @returns
 */
export const validate = <T>(responder: Responder<Required<NonNullObj<T>>>, authZData: T, ...tests:ValidationTest<Partial<T>>[]) : IFunc => async (event, context) => {
  const errors = (await Promise.all(
    tests.map(t => t(event, context, authZData))
  )).filter((t) => typeof t === 'boolean' ? !t : !t.passed)
    .map((t) => {
      // .filter pulls out all plain `true` vals
      const { passed, ...data } = t as ValidationResp
      return data
    })

  if (hasNoErrors(authZData, errors)) {
    return responder(authZData, event, context)
  } else {
    return {
      statusCode: HttpStatusCode.BAD_REQUEST,
      body: JSON.stringify({ errors })
    } as SRet
  }
}

const hasNoErrors = <T, U>(input:T | {}, errorList:U[]): input is Required<NonNullObj<T>> => {
  return errorList.length === 0
}

export default validate
