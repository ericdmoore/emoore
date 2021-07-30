import { Lambda } from 'aws-sdk'
import type { InvocationType, FunctionList, InvocationRequest } from 'aws-sdk/clients/lambda'
import type { Credentials, CredentialsOptions } from 'aws-sdk/lib/credentials'

const isErrorShape = (maybeErr:unknown): maybeErr is Error =>{
    const keySet = new Set(Object.keys(maybeErr as object))
    return keySet.has('name')
    && keySet.has('message') 
    && keySet.has('stack')
}

/**
 * Run On Lambda
 * Provided the credentials once and then save that off to a variable
 * @param credentials
 * @example
 * const creds = syncLoadMyCredsFromSomePlace()
 * const myLambdas = runOnLambda(creds)
 * @see: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#invoke-property
 */
export const runOnLambda = (_cfg:LambdaConfiguration) => {
    const cfg = {region:'us-west-2', ..._cfg}

    /**
    * Store the FunctionName from AWS into a nother variable
    * @param fnName 
    * @param opts
    * @param opts.region
    * @param opts.invocationType
    * @example
    * const imageResizer = myLambdas('imgSizer')
    */
    return <T>(fnName:string, opts:AWSLambdaOpts = {invocationType: 'RequestResponse'}) => {
        const {region, credentials} = cfg
        const l = new Lambda({region, credentials})
        let funcsForAccount: FunctionList | undefined = undefined
   
       /**
        * @param paylaod
        * @example
        * conts file = readFileSync('./somepath.jpg')
        * const buf = await imageResizer({input:file, params:{width:400}})
        */
       return async (payload: Buffer | Uint8Array | Blob | string ): Promise<T> => {
           // on first invaction chcek for the function
           if(!funcsForAccount){ 
               funcsForAccount = (await l.listFunctions().promise()).Functions
            }
   
           if(!!funcsForAccount && !funcsForAccount.some(fn => fn.FunctionName === fnName)){
                console.error(`Function Requested: ${fnName}`) 
                console.error(` Can not be found in ${funcsForAccount.map(f=>f.FunctionName)}`)
                
                const err = Error()
                err.name = 'Given Function Not Found'
                err.message = `Function Name:${fnName} cannot be found - available: $${funcsForAccount.map(f=>f.FunctionName)}`
                return Promise.reject(err)
           }else{
                const ret = await l.invoke({ 
                   FunctionName: fnName,    
                   InvocationType:opts.invocationType,
                   Payload: payload
               }).promise()
               .catch(er => Error(er))

            //    console.log({ret})

               if(isErrorShape(ret)){
                    return Promise.reject(ret)
               }else{
                    if( [200,202,204].includes(ret.StatusCode ?? 400) && !ret.FunctionError){
                        // parse here to save every caller
                        return JSON.parse(ret.Payload?.toString() ?? '{}') as T
                    }else{
                        const err = Error()
                        err.name = `AWS Lambda Function Errored out - Status Code: ${ret.StatusCode} Indicates Failure ${ret.FunctionError}`
                        err.message = `aws-returned-data: ${JSON.stringify(ret, null, 2)}`
                        return Promise.reject(err)
                    }
               }
           }
       }
   }
}

// #region interfaces
interface LambdaConfiguration{
    credentials: Credentials | CredentialsOptions
    region?:string
}

type AWSLambdaOpts = {invocationType?: InvocationType} & Omit<Omit<InvocationRequest, 'InvocationRequest' >,'FunctionName'>
// #endregion interfaces