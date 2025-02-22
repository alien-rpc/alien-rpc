import create from '@alien-rpc/generator'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative } from 'node:path'
import prettier from 'prettier'
import { dedent, defer, sort, uid } from 'radashi'
import { globSync } from 'tinyglobby'
import { createTestContext } from './helper.js'

describe.concurrent('generator', () => {
  const fixturesDir = join(__dirname, 'generator/__fixtures__')
  const fixtures = globSync(['**/routes.ts', '!**/tmp-*'], {
    cwd: fixturesDir,
    absolute: true,
  })

  const generators = createTestContext()

  for (const routeFile of fixtures) {
    const testDir = dirname(routeFile)
    const testName = relative(fixturesDir, testDir)

    const optionsFile = join(testDir, 'options.json')
    const overrides = existsSync(optionsFile)
      ? JSON.parse(readFileSync(optionsFile, 'utf-8'))
      : {}

    const generator = generators.get(fixturesDir, overrides)

    generator.tests.push({
      name: testName,
      run: async () => {
        generator.resetFiles(testDir)
        generator.instance ??= generator.start({
          watch: true,
        })

        await generator.instance.waitForStart(3000)
        await generator.instance

        const outputFiles = globSync('**/*.ts', {
          cwd: generator.root,
        })

        const output = await Promise.all(
          sort(outputFiles, name => name.split('/').length).map(async name => {
            const file = join(generator.root, name)
            const fileInfo = await prettier.getFileInfo(file)

            let content = readFileSync(file, 'utf-8')
            if (fileInfo.inferredParser) {
              content = await prettier.format(content, {
                parser: fileInfo.inferredParser,
                filepath: file,
              })
            }

            return `/**\n * ${name}\n */\n${content}`
          })
        ).then(files => {
          return '// @ts-nocheck\n\n' + files.join('\n')
        })

        // Copy the generated files back to the test directory, where they
        // will be used by the client test.
        for (const file of outputFiles) {
          if (file.endsWith('/api.ts')) {
            const outFile = join(testDir, file)
            mkdirSync(dirname(outFile), { recursive: true })
            copyFileSync(join(generator.root, file), outFile)
          }
        }

        const snapshotFile =
          testDir.replace('__fixtures__', '__snapshots__') + '.snap.ts'

        await expect(output).toMatchFileSnapshot(snapshotFile)
      },
    })
  }

  for (const generator of generators.current) {
    describe.sequential(JSON.stringify(generator.options), () => {
      for (const { name, run } of generator.tests) {
        test(name, run)
      }
    })
  }

  test('update routes file', () =>
    defer(async defer => {
      const testDir = join(__dirname, '.tmp', uid(10))

      mkdirSync(testDir, { recursive: true })
      defer(() => rmSync(testDir, { recursive: true, force: true }))

      const files = {
        'server/api/types.ts': dedent`
          import { t } from '@alien-rpc/service'

          export type UUID = string & t.Format<'uuid'>
        `,
        'server/api/books.ts': dedent`
          import { route } from '@alien-rpc/service'
          import type { UUID } from './types.js'

          export const getBook = route('/books/:id').get(async (id: UUID) => {})
        `,
        'server/api/authors.ts': dedent`
          import { route } from '@alien-rpc/service'
          import type { UUID } from './types.js'

          export const getAuthor = route('/authors/:id').get(async (id: UUID) => {})
        `,
        'tsconfig.json': JSON.stringify({
          compilerOptions: {
            strict: true,
            module: 'esnext',
            moduleResolution: 'bundler',
          },
        }),
      }

      for (let [name, content] of Object.entries(files)) {
        name = join(testDir, name)
        mkdirSync(dirname(name), { recursive: true })
        writeFileSync(name, content)
      }

      const generate = create({
        include: 'server/api/**/*.ts',
        outDir: '.',
        clientOutFile: 'client/api.ts',
        serverOutFile: 'server/api.ts',
      })

      const instance = generate({
        root: testDir,
        watch: true,
      })

      // Intercept emitted events.
      const emit = vi.fn(instance.events.emit.bind(instance.events))
      instance.events.emit = emit

      // Read all written files into a string.
      const getWrittenFiles = () =>
        emit.mock.calls
          .filter(call => call[0] === 'write')
          .map(
            call =>
              '// ' +
              relative(testDir, call[1] as string) +
              '\n' +
              readFileSync(call[1] as string, 'utf-8')
          )
          .join('\n\n')

      await instance.waitForStart(3000)
      await instance

      expect(getWrittenFiles()).toMatchInlineSnapshot(`
        "// server/api.ts
        import * as Type from "@sinclair/typebox/type"
        import { addStringFormat, UuidFormat } from "@alien-rpc/service/formats"

        addStringFormat("uuid", UuidFormat)

        export const UUID = Type.String({ format: "uuid" })

        export default [{path: "/authors/:id", method: "GET", pathParams: ["id"], name: "getAuthor", import: () => import("./api/authors.js"), format: "json", pathSchema: Type.Object({
        id: UUID
        })}, {path: "/books/:id", method: "GET", pathParams: ["id"], name: "getBook", import: () => import("./api/books.js"), format: "json", pathSchema: Type.Object({
        id: UUID
        })}] as const

        // client/api.ts
        import type { RequestOptions, RequestParams, Route } from "@alien-rpc/client"

        export type UUID = string

        export const getAuthor: Route<"authors/:id", (params: RequestParams<{ id: UUID }, Record<string, never>>, requestOptions?: RequestOptions) => Promise<undefined>> = {path: "authors/:id", method: "GET", pathParams: ["id"], arity: 2, format: "json"} as any

        export const getBook: Route<"books/:id", (params: RequestParams<{ id: UUID }, Record<string, never>>, requestOptions?: RequestOptions) => Promise<undefined>> = {path: "books/:id", method: "GET", pathParams: ["id"], arity: 2, format: "json"} as any"
      `)

      // Add a new getBooks route.
      writeFileSync(
        join(testDir, 'server/api/books.ts'),
        dedent`
          import { route } from '@alien-rpc/service'
          import type { UUID } from './types.js'

          export const getBook = route('/books/:id').get(async (id: UUID) => {})
          export const getBooks = route('/books').get(async () => [])
        `
      )

      emit.mockClear()
      await instance.waitForStart(3000)
      await instance

      expect(getWrittenFiles()).toMatchInlineSnapshot(`
        "// server/api.ts
        import * as Type from "@sinclair/typebox/type"
        import { addStringFormat, UuidFormat } from "@alien-rpc/service/formats"

        addStringFormat("uuid", UuidFormat)

        export const UUID = Type.String({ format: "uuid" })

        export default [{path: "/authors/:id", method: "GET", pathParams: ["id"], name: "getAuthor", import: () => import("./api/authors.js"), format: "json", pathSchema: Type.Object({
        id: UUID
        })}, {path: "/books/:id", method: "GET", pathParams: ["id"], name: "getBook", import: () => import("./api/books.js"), format: "json", pathSchema: Type.Object({
        id: UUID
        })}, {path: "/books", method: "GET", name: "getBooks", import: () => import("./api/books.js"), format: "json"}] as const

        // client/api.ts
        import type { RequestOptions, RequestParams, Route } from "@alien-rpc/client"

        export type UUID = string

        export const getAuthor: Route<"authors/:id", (params: RequestParams<{ id: UUID }, Record<string, never>>, requestOptions?: RequestOptions) => Promise<undefined>> = {path: "authors/:id", method: "GET", pathParams: ["id"], arity: 2, format: "json"} as any

        export const getBook: Route<"books/:id", (params: RequestParams<{ id: UUID }, Record<string, never>>, requestOptions?: RequestOptions) => Promise<undefined>> = {path: "books/:id", method: "GET", pathParams: ["id"], arity: 2, format: "json"} as any

        export const getBooks: Route<"books", (requestOptions?: RequestOptions) => Promise<never[]>> = {path: "books", method: "GET", arity: 1, format: "json"} as any"
      `)

      // Remove the getBooks route.
      writeFileSync(
        join(testDir, 'server/api/books.ts'),
        dedent`
          import { route } from '@alien-rpc/service'
          import type { UUID } from './types.js'

          export const getBook = route('/books/:id').get(async (id: UUID) => {})
        `
      )

      emit.mockClear()
      await instance.waitForStart(3000)
      await instance

      expect(getWrittenFiles()).toMatchInlineSnapshot(`
        "// server/api.ts
        import * as Type from "@sinclair/typebox/type"
        import { addStringFormat, UuidFormat } from "@alien-rpc/service/formats"

        addStringFormat("uuid", UuidFormat)

        export const UUID = Type.String({ format: "uuid" })

        export default [{path: "/authors/:id", method: "GET", pathParams: ["id"], name: "getAuthor", import: () => import("./api/authors.js"), format: "json", pathSchema: Type.Object({
        id: UUID
        })}, {path: "/books/:id", method: "GET", pathParams: ["id"], name: "getBook", import: () => import("./api/books.js"), format: "json", pathSchema: Type.Object({
        id: UUID
        })}] as const

        // client/api.ts
        import type { RequestOptions, RequestParams, Route } from "@alien-rpc/client"

        export type UUID = string

        export const getAuthor: Route<"authors/:id", (params: RequestParams<{ id: UUID }, Record<string, never>>, requestOptions?: RequestOptions) => Promise<undefined>> = {path: "authors/:id", method: "GET", pathParams: ["id"], arity: 2, format: "json"} as any

        export const getBook: Route<"books/:id", (params: RequestParams<{ id: UUID }, Record<string, never>>, requestOptions?: RequestOptions) => Promise<undefined>> = {path: "books/:id", method: "GET", pathParams: ["id"], arity: 2, format: "json"} as any"
      `)
    }))

  afterAll(generators.clear)
})
