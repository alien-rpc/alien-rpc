import { createProject } from 'tsc-extra'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const project = await createProject(packageRoot)
const sourceFile = project.getSourceFileOrThrow(
  path.join(packageRoot, 'src/index.ts')
)
const diagnostics = project.getProgram().getSemanticDiagnostics(sourceFile)

console.log({
  compilerVersion: project.compilerVersion,
  sourceFile: path.relative(packageRoot, sourceFile.fileName),
  semanticDiagnostics: diagnostics.length,
})
