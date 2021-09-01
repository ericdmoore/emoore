/**
 * @see: https://us-west-2.console.aws.amazon.com/lambda/home?region=us-west-2#/functions/RealWrapperTestUtil?tab=code
 */

import {runOnLambda} from '../../server/utils/aws-lambda-wrapper'
import {Lambda, Credentials, SharedIniFileCredentials} from 'aws-sdk'

const credentials = new SharedIniFileCredentials({profile:'personal_default'})

test('Assert `RealWrapperTestUtil` is available', async ()=>{
    const l = new Lambda({credentials, region:'us-west-2'})
    const list = await l.listFunctions().promise()

    expect(
        (list.Functions ?? []).map(f => f.FunctionName)
    ).toContain('RealWrapperTestUtil')
})

test('Credential Input',async ()=>{
    const myfuncs = runOnLambda({credentials})
    expect(myfuncs).toBeInstanceOf(Function)
})

test('Function Name Input',async ()=>{
    const myfuncs = runOnLambda({credentials})
    const func1 = myfuncs('func')
    expect(func1).toBeInstanceOf(Function)
})

test('Invalid Function Name Input Gives a Rejected Promise',async ()=>{
    const myfuncs = runOnLambda({credentials})
    const func1 = myfuncs('func1')
    await expect(func1('Func1 DNE'))
            .rejects
            .toBeTruthy()
})

test('Invalid Inputs for a Valid Function',async ()=>{
    const myFuncs = runOnLambda({credentials})
    const resizer = myFuncs('resize_Images')
    // const res = 
    await expect(
        resizer('SomeNonsensInput')
    ).rejects.toBeTruthy()
})

test('Valid Function w/ Valid Inputs',async ()=>{
    const myFuncs = runOnLambda({credentials})
    const adder = myFuncs<{type:'Buffer', data:number[]}>('RealWrapperTestUtil')
    const res = (await adder(
        JSON.stringify([1,2,3,4,5,6,7,8,9])
    )).data

    expect(res).toEqual([45])
})