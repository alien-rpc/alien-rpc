export async function resolveStackTrace(stack: string | undefined) {
  if (typeof window === 'undefined' && stack) {
    return (await import('resolve-stack-sources')).getSourceMappedString(stack)
  }
  return stack
}
