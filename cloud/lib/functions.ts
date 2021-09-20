import type { BuildOptions } from 'esbuild'

// import type { ZlibOptions } from 'zlib'
import { join, dirname, basename, extname, resolve } from 'path'
//
import * as cdk from '@aws-cdk/core'
import * as lambda from '@aws-cdk/aws-lambda'


import AdmZip from 'adm-zip'
import webpack from 'webpack'
import type {Configuration, Stats} from 'webpack'
import { build as esbuild } from 'esbuild'

// #region interfaces
type PathUnion = string | {zip:string, fn: lambda.FunctionProps}
type Dict<T> = {[key:string]:T}

// #endregion interfaces

// eslint-disable-next-line no-unused-vars
const swapExt = (infile:string, newExt = '.zip') => join(
  dirname(infile),
  basename(infile, extname(infile)) + newExt
)

// eslint-disable-next-line no-unused-vars
const printJSON = (d:any) => console.log(JSON.stringify(d, null, 2))
const webpackP = (cfg: Configuration) => new Promise((resolve, reject) => webpack( cfg, (er,stats)=> er ? reject(er) : resolve(stats as webpack.Stats) )) as Promise<webpack.Stats>

const webpackCfg_default: Configuration = {
  target:'node', 
  mode:'production',
  resolve: { extensions: [ '.ts', '.tsx', '.js' ] },
  externals:['aws-sdk', 'mock-aws-s3','nock'],
  module: { 
    rules: [ 
      { test: /\.tsx?$/, loader: 'ts-loader' , exclude:'/node_modules/'} 
    ] 
  },
}


export class Functions extends cdk.Construct {
  scope: cdk.Construct
  nodeId: string
  distPath : string
  props: {
    srcPaths: Dict<string>
    bundledPaths:Dict<string>
    zipPaths: Dict<string>
  }

  /**
   *
   * Functions Constructor
   * @param scope - cdk.Construct
   * @param id - Node ID in CFM tree
   * @param distPath - path segment to  place the built bundles
   * @param props - Dict of <src + zip path array>
   */
  constructor (scope: cdk.Construct, id: string, distPath: string, props?:Dict<{src:string[], zip:string[]}>) {
    super(scope, id)
    this.scope = scope
    this.nodeId = id
    this.distPath = distPath
    this.props = {
      bundledPaths: {},
      srcPaths: Object.entries(props || {}).reduce((p, [ƒnName, val]) => ({ ...p, [ƒnName]: resolve(...val.src) }), {}),
      zipPaths: Object.entries(props || {}).reduce((p, [ƒnName, val]) => ({ ...p, [ƒnName]: resolve(...val.zip) }), {})
    }
  }

  /**
   * Add more Function Maps before running the Make Lambda method.
   * @param basePaths - [`srcBasePathsArr`, `zipBasePathsArr`]
   * @param srcs - Dict<src, zip>
   */
  addMoreFuncs (basePaths:[string[], string[]], srcs:Dict<string[] | {src:string[], zip?:string[]}>) {
    const [srcBasePaths, zipBasePaths] = basePaths
    this.props = {
      ...this.props, // leave bundles this one alone
      srcPaths: Object.entries(srcs).reduce((p, [ƒnName, val]) =>
        Array.isArray(val)
          ? ({ ...p, [ƒnName]: resolve(...srcBasePaths, ...val) })
          : ({ ...p, [ƒnName]: resolve(...srcBasePaths, ...val.src) }),
      this.props.srcPaths),

      zipPaths: Object.entries(srcs).reduce((p, [ƒnName, val]) =>
        Array.isArray(val)
          ? ({ ...p, [ƒnName]: swapExt(resolve(...zipBasePaths, ...val)) }) // simple string opt
          : val.zip
          // take the path parts - resolve into full path, for ƒnName
            ? ({ ...p, [ƒnName]: resolve(...zipBasePaths, ...val.zip) }) // has a zip opt
          // if none provided, just swap the filename.(j|t|mj)s to .zip
            : ({ ...p, [ƒnName]: swapExt(resolve(...zipBasePaths, ...val.src)) }) // defaults back to src
      , this.props.zipPaths)
    }
    return this
  }

  /**
   *
   * @param distPath - base output path
   * @param buildOpts - esbuild configs ignores =[`bundle`, `platform`, `target`, `external`, `entryPoints`, `outfile`, `outdir`]
   * @sideEffect - Creates a file on fs for each of the named srcPath
   */
  async esbuildBundleToDist (buildOpts: BuildOptions = {}) {
    this.props.bundledPaths = Object.entries(this.props.srcPaths)
      .reduce((p, [name, src], i) => ({
        ...p,
        [name]: resolve(join(this.distPath, name, 'index.js'))
      }), {})

    return Promise.all(
      Object.entries(this.props.srcPaths)
      .map(([name, srcPath]) =>
        esbuild({
          treeShaking:true,
          ...buildOpts,
          bundle: true,
          platform: 'node',
          target: 'node14',
          external: ['aws-sdk', 'mock-aws-s3', 'nock'].concat(buildOpts.external ?? [] ),
          format: 'cjs',
          // minify: true,
          entryPoints: [srcPath],
          outfile: this.props.bundledPaths[name]
        })
      )
    )
  }

  /**
   * 
   * @sideEffect
   */
  async webpackBuildToDist(cfg: Configuration){
    const config = {
      plugins:[
        new webpack.ProgressPlugin(),
        new webpack.PrefetchPlugin()
      ],
      entry: {
        expand: resolve(__dirname, '../../server/funcs/expand.ts'),
        links:  resolve(__dirname, '../../server/funcs/links.ts'),
        root:   resolve(__dirname, '../../server/funcs/root.ts'),
        stats:  resolve(__dirname, '../../server/funcs/stats.ts'),
        tokens: resolve(__dirname, '../../server/funcs/tokens.ts'),
        users:  resolve(__dirname, '../../server/funcs/users.ts'),
      },
      optimization:{
        innerGraph: true,
        usedExports: true,
      },
      ...cfg,
      externals:['aws-sdk'].concat(cfg.externals as string[]),
      output:{
        path: resolve(__dirname,'../dist'),
        filename: './[name]/index.js',
      }
    } as Configuration
    
    console.log(config)
    console.time('webpack')
    const stats = await webpackP(config) as Stats
    console.timeEnd('webpack')
    stats.hasErrors() &&  console.error(stats.compilation.errors)
    return stats
  }

  /**
   * Zip Up the preconfigured bundles into the preconfgure zip locales
   * @returns
   */
  async zipBundles () {
    //
    const zipDir = (fnName:string, bundedPath:string) : Promise<null> =>
      new Promise((resolve, reject) => {
        const zip = new AdmZip()
        zip.addLocalFile(bundedPath)
        zip.writeZip(this.props.zipPaths[fnName], (er) => {
          er ? reject(er) : resolve(null)
        })
      })

    return Promise.all(
      Object.entries(this.props.bundledPaths)
        .map(async ([name, bundedPath]) => zipDir(name, bundedPath))
    ) 
  }

  /**
   *
   * @param applyFnConfig
   * @param applyBuildOpts
   * @param grantMap
   */
  async bundleLambdas (applyFnConfig: Dict<Partial<lambda.FunctionProps>> = {}, applyBuildOpts: BuildOptions = {}, grantMap: Dict<string> = {}) : Promise<Dict<lambda.Function>> {
    // sideEffectFns
    // console.time('esbuilds')
    await this.esbuildBundleToDist(applyBuildOpts)
    // console.timeEnd('esbuilds')
    
    // const stats = await this.webpackBuildToDist(webpackCfg_default)

    // console.dir(stats)
    // // throw new Error("stop here")
    
    await this.zipBundles()

    // printJSON(this.props)

    return Object.entries(this.props.zipPaths)
      .reduce(async (p, [name, path]: [string, PathUnion]) => ({
        ...(await p),
        [name]: new lambda.Function(this.scope, name, {
          functionName: name,
          handler: 'index.handler',
          runtime: lambda.Runtime.NODEJS_14_X,
          code: lambda.Code.fromAsset(typeof path === 'string' ? path : path.zip),
          // overrite if given a valid fnConfig obj
          ...applyFnConfig[name]
        })
      }), Promise.resolve({}) as Promise<Dict<lambda.Function>>)
  }
}