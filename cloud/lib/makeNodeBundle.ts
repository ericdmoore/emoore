import type { BuildOptions } from 'esbuild'
import type { ZlibOptions } from 'zlib'

import { build as esbuild } from 'esbuild'
import { mkdir as mkd, readFile, createWriteStream } from 'fs'
import { join, dirname, extname, basename, resolve } from 'path'
import { gzip as gz } from 'zlib'
import { Readable, Writable } from 'stream'
import { promisify } from 'util'

// #region interfaces
type PromiseOr<T> = T | Promise<T>
export type NodeBundleOpts = Omit<Omit<Omit<Omit<Omit<Omit<BuildOptions, 'bundle'>, 'write'>, 'target'>, 'outfile'>, 'entryPoints'>, 'platform'>
// #endregion interfaces

const mkdir = promisify(mkd)
const readFileP = promisify(readFile)

const gzip = async (inBuffer:PromiseOr<Buffer>, opts: ZlibOptions = {}) => {
  const b = await inBuffer
  return new Promise((resolve, reject) =>
    gz(b, opts, (err, buff) => err ? reject(err) : resolve(buff as Buffer))
  )as Promise<Buffer>
}

const swapExt = (path:string, dotExt = '.zip') => {
  return join(dirname(path), basename(path, extname(path)) + dotExt)
}

const pipeFinishes = async (input: PromiseOr<Buffer>, w:Writable) => {
  let i = await input
  const r = new Readable({
    read: function (size) {
      if (i.length > 0) {
        this.push(i.slice(0, size))
        i = i.slice(size)
      } else {
        this.push(null)
      }
    }
  })

  return new Promise((resolve, reject) => {
    r.pipe(w)
      .on('finish', resolve)
      .on('error', reject)
  }) as Promise<null>
}

/**
 * Make Bundled Node File
 * @param entryParts - pre-resolved string or pathParts to be resolved
 * @param outfile - pre-resolved string or pathParts to be resolved
 * @param opts - esbuild options excluding the hard-valued ones
 */
export const makeNodeBundle = async (entryParts: string | string[], outfile: string | string[], opts?: Partial<NodeBundleOpts>) => {
  const outFilePath = typeof outfile === 'string' ? outfile : resolve(...outfile)
  const outZipPath = swapExt(outFilePath)

  console.log({ outFilePath, outZipPath })

  await mkdir(dirname(outFilePath), { recursive: true })

  return esbuild({
    bundle: true,
    write: true,
    target: 'es2019',
    platform: 'node',
    outfile: outFilePath,
    entryPoints: typeof entryParts === 'string' ? [entryParts] : [resolve(...entryParts)],
    ...opts
  }).then(async r => {
    if (r.warnings.length > 0) console.info(r.warnings)

    await pipeFinishes(gzip(readFileP(outFilePath)), createWriteStream(outZipPath))

    return {
      ...r,
      outFilePath,
      outZipPath
    }
  })
}

export default makeNodeBundle
