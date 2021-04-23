import * as cdk from '@aws-cdk/core'
import * as lambda from '@aws-cdk/aws-lambda'
import { join } from 'path'
import bundleAndZip, { NodeBundleOpts } from './makeNodeBundle'

// #region interfaces
export type BundleOpts = NodeBundleOpts

export interface BaseFuncOpts{
  in:{ path: string | string[] }
  out:{ path: string | string[], fileName?: string }
  name?: string
  memSize?: number
  description?: string
  handler?: string
}
export type MakeNodeFunctionAsset = (
  scope: cdk.Construct,
  id: string,
  props: BaseFuncOpts,
  bundleOpts?: NodeBundleOpts,
  functionOpts?: lambda.FunctionProps)=>Promise<lambda.Function>
// #endregion interfaces

/**
 *
 * Bundle CDK Node Function
 * @param scope - CDK parent node
 * @param id - tree ID
 * @param props - in + out
 * @param bundleOpts - esbuild options
 * @param functionOpts - lambda Function
 */
export const bundledCDKNodeFunction: MakeNodeFunctionAsset = async (
  scope: cdk.Construct,
  id: string,
  props: BaseFuncOpts,
  bundleOpts?: NodeBundleOpts,
  functionOpts?: lambda.FunctionProps
) => {
  const outPath: string = Array.isArray(props.out.path) && props.out.fileName
    ? join(...[...props.out.path, props.out.fileName]) as string
    : props.out.path as string

  console.log({ outPath })

  await bundleAndZip(props.in.path, outPath, bundleOpts)

  return new lambda.Function(scope, id, {
    ...functionOpts,
    code: lambda.Code.fromAsset(outPath),
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: props?.handler ?? 'default',
    description: props?.description,
    functionName: props?.name,
    memorySize: props?.memSize ?? 256
  })
}

export default bundledCDKNodeFunction
