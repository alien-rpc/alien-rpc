import fs from 'node:fs'
import path from 'node:path'
import { diff, isString, sift } from 'radashi'
import { globSync } from 'tinyglobby'
import { defineConfig, Options } from 'tsup'

// https://github.com/egoist/tsup/issues/1233
type Plugin = Exclude<import('tsup').Options['plugins'], void>[number]

function defineBuild(importer: string, overrides?: Options) {
  const pkgPath = new URL('package.json', importer).pathname
  const pkg = readPackage(pkgPath)

  return defineConfig({
    format: ['esm'],
    splitting: pkg.entry.length > 1,
    ...overrides,
    dts: pkg.dts && { resolve: true },
    entry: pkg.entry,
    outDir: pkg.outDir,
    external: [...pkg.dependencies, ...(overrides?.external || [])],
    plugins: sift([overrides?.plugins, deleteOldFiles(pkg)]).flat(),
  })
}

export { defineBuild as defineConfig }

type Package = ReturnType<typeof readPackage>

function readPackage(pkgPath: string) {
  const metadata = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  if (!metadata.exports) {
    throw new Error(`Package ${metadata.name} has no exports`)
  }

  let dts = false

  type PackageExports = {
    [k: string]: string | PackageExports
  }

  const entryGlobs = Object.values(metadata.exports as PackageExports)
    .concat(metadata.bin ? Object.values(metadata.bin) : [])
    .flatMap(function extractEntries(value): string | string[] {
      if (!isString(value)) {
        if ('types' in value) {
          dts = true
        }
        return Object.values(value).flatMap(extractEntries)
      }
      return value.replace('dist/', 'src/').replace(/.js$/, '.ts')
    })

  return {
    root: path.dirname(pkgPath),
    entry: globSync(entryGlobs, {
      cwd: path.dirname(pkgPath),
    }),
    dependencies: Object.keys(metadata.dependencies || {}).concat(
      Object.keys(metadata.peerDependencies || {})
    ),
    outDir: 'dist',
    dts,
  }
}

function deleteOldFiles(pkg: Package): Plugin {
  return {
    name: 'delete-old-files',
    buildEnd({ writtenFiles }) {
      const neededFiles = writtenFiles.map(file => file.name)
      const presentFiles = globSync([
        pkg.outDir + '/**',
        '!**/package.json',
        '!**/*.d.ts',
      ])

      const oldFiles = diff(presentFiles, neededFiles)
      const oldDirs = new Set<string>()

      // Remove obsolete files
      for (const file of oldFiles) {
        fs.rmSync(file)
        oldDirs.add(path.dirname(file))
      }

      // Remove empty directories
      for (let dir of oldDirs) {
        try {
          while (true) {
            // This throws if the directory is not empty
            fs.rmdirSync(dir)
            dir = path.dirname(dir)
          }
        } catch {}
      }
    },
  }
}
