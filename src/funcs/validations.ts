import { HttpStatusCode } from '../enums/HTTPstatusCodes'
import type { IFunc, SRet, Evt, Ctx, Responder, NonNullObj } from '../types'

export interface ValidationResp{
  code: number
  reason: string
  passed: boolean
  InvalidDataLoc?: string
  InvalidDataVal?: string
  docRef?: string
  expensiveData?: {[key:string]:unknown}
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
 * @param preValidationData
 * @param tests
 * @returns
 */
export const validate = <T>(responder: Responder<Required<NonNullObj<T>>>, preValidationData: T, ...tests:ValidationTest<Partial<T>>[]) : IFunc => {
  const hasNoErrors = <T, U>(input:T | {}, errorList:U[]): input is Required<NonNullObj<T>> => {
    return errorList.length === 0
  }

  return async (event, context) => {
    const allFuncResp = ( await Promise.all(
        tests.map(async (t) => t(event, context, preValidationData))
      ).catch(er => {
        console.error('validationTestFunc rejected:', er)
        return [{
        code: 400,
        reason: 'Experienced an Application Error During Validation',
        passed: false,
        InvalidDataVal: er
      }] as ValidationResp[]}))

    const expensiveData = (allFuncResp.filter(t => typeof t !== 'boolean' ) as ValidationResp[])
      .reduce(
      (p, c) => ({ ...p, ...c.expensiveData }),
      {} as {[key:string]:unknown}
    )

    const errors = (allFuncResp.filter(t => typeof t === 'boolean' ? !t : !t.passed) as ValidationResp[])
      .map((t) => {
        const { expensiveData, passed, ...data } = t as ValidationResp
        return data
      })

    // console.log({ errors, preValidationData })
    
    if (hasNoErrors(preValidationData, errors)) {
      return responder(preValidationData, event, context, expensiveData)
    } else {
      return {
        statusCode: HttpStatusCode.BAD_REQUEST,
        isBase64Encoded: false,
        body: JSON.stringify({ errors })
      } as SRet
    }
  }
}

export default validate
