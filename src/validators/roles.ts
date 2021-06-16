import type { JWTObjectOutput, Evt } from '../types'
import type { ValidationTest } from '../funcs/validations'
import type { ILoginInfoInput } from '../funcs/tokens'
import type { IUser } from '../entities'
//
import first from '../utils/first'
import { user } from '../entities'
import { createHmac } from 'crypto'
import { btoa } from '../utils/base64'
import { pluckDataFor } from '../utils/pluckData'
import { jwtVerify } from '../auths/validJWT'
import { hasElements } from '../utils/objectKeyCheck'


export const hasProperRole = (...roles:string[])=> async (e:Evt)=>{
    
}