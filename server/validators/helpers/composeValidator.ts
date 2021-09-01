import type {  Evt, Ctx } from '../../types'
import type {
  ValidationTest, 
  ValidationResp
} from '../../funcs/validations'

const joinStrings = (sep:string, fallback='')=>(s1: string | undefined, s2:string | undefined)=>{
  return s1 && s2 ? [s1,s2].join(sep) : s1 ? s1 : s2 ? s2 : fallback
}

const joinBools = (op:'and' | 'or')=> (b1: boolean | undefined, b2:boolean | undefined)=>{
  return op ==='and' ? !!b1 && !!b2 : !!b1 || !!b2
}

const comma = joinStrings(', ')
const and = joinBools('and')

export const compose = (...valFns:(ValidationTest<unknown>)[])=> async (e:Evt,c:Ctx):Promise<ValidationResp[] | null> => { 
  const allFuncResp = ( await Promise.all(
        valFns.map(async (t) => t(e, c, null))
    ).catch(er => [{
      code: 400,
      passed: false,
      reason: 'Experienced an Application Error During Validation',
      InvalidDataVal: er
    }] as ValidationResp[]))

  const errors = (allFuncResp.filter(t => typeof t === 'boolean' ? !t : !t.passed) as ValidationResp[])
    .map((t) => {
      const { expensiveData, passed, ...valResp } = t as ValidationResp
      return valResp
    })

  return errors.length > 0 ? errors as ValidationResp[] : null    
}

export const mergeErrors = (...errs:ValidationResp[]) => {
  return errs.reduce((p,c) => {
    return {
      code: 400 as number, 
      passed: and(c.passed, p.passed) as boolean,
      reason: comma(p.reason, c.reason),
      docRef: comma(p.docRef, c.docRef),
      InvalidDataLoc: comma(p.InvalidDataLoc, c.InvalidDataLoc),
      InvalidDataVal: comma(p.InvalidDataVal, c.InvalidDataVal),
    }
  },
  { code: 400,
    passed: true,
    reason: undefined,
    docRef: undefined,
    InvalidDataLoc: undefined,
    InvalidDataVal: undefined } as Partial<ValidationResp>
  ) as ValidationResp
}

export default compose