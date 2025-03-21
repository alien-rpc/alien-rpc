export type Promisable<T> = T | Promise<T>

// https://github.com/microsoft/TypeScript/issues/14829#issuecomment-504042546
export type NoInfer<T> = [T][T extends any ? 0 : never]

// Remove the last element from a tuple type.
export type RemoveLast<T extends any[]> = T extends [...infer Rest, any]
  ? Rest
  : never

// Infer the last element of a tuple type.
export type Last<T extends any[]> = T extends [...any[], infer Last]
  ? Last
  : never

// Infer the platform type of a RequestContext type.
export type InferPlatform<T> = T extends { platform: infer P } ? P : unknown
