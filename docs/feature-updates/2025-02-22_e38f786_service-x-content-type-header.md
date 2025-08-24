# Service X-Content-Type Header for JSON Sequences

**Commit:** e38f7867683f04b8bc55d91e869d65ab2cd4d1fe
**Author:** Alec Larson
**Date:** Sat Feb 22 21:33:02 2025 -0500
**Short SHA:** e38f786

## Summary

This commit adds an `X-Content-Type: application/json-seq` header to JSON Text Sequence responses, enabling middleware to accurately identify streaming JSON responses without false positives from plain text responses.

## User Impact

**Audience:** Middleware developers, monitoring systems, and infrastructure components
**Breaking Change:** No - additive enhancement
**Migration Required:** No - existing code continues to work unchanged

## Key Changes

### Header Addition

```ts
// In packages/service/src/responders/json-seq.ts
const responder: RouteResponder = (route, args, ctx) => {
  const stream = ReadableStream.from(
    generateJsonTextSequence(route, args, ctx.url)
  )

  // Don't use "application/json-seq" until it's been standardized.
  ctx.response.headers.set('Content-Type', 'text/plain; charset=utf-8')
  ctx.response.headers.set('X-Content-Type', 'application/json-seq') // ← Added

  return new Response(stream, ctx.response)
}
```

### Header Purpose

- **Primary Content-Type:** Remains `text/plain; charset=utf-8` for compatibility
- **Secondary X-Content-Type:** Added `application/json-seq` for identification
- **Middleware detection:** Enables accurate identification of JSON streaming responses
- **False positive prevention:** Distinguishes from regular plain text responses

## Implementation Details

### Response Headers Structure

```http
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
X-Content-Type: application/json-seq
Transfer-Encoding: chunked

\x1E{"id":1,"name":"Item 1"}\x0A
\x1E{"id":2,"name":"Item 2"}\x0A
\x1E{"id":3,"name":"Item 3"}\x0A
```

### Why Two Content-Type Headers?

#### Primary Content-Type Reasoning

```ts
// Uses text/plain for broad compatibility
ctx.response.headers.set('Content-Type', 'text/plain; charset=utf-8')

// Reasons for text/plain:
// 1. application/json-seq is not yet standardized
// 2. Prevents response buffering on iOS
// 3. Ensures streaming behavior across all clients
// 4. Avoids issues with non-compliant proxies/CDNs
```

#### Secondary X-Content-Type Purpose

```ts
// Provides semantic information for middleware
ctx.response.headers.set('X-Content-Type', 'application/json-seq')

// Benefits:
// 1. Middleware can identify JSON streaming responses
// 2. Monitoring systems can categorize traffic correctly
// 3. Logging can differentiate from plain text responses
// 4. Custom processing can be applied to JSON sequences
```

### JSON Text Sequence Format

```
\x1E{"record":1}\x0A
\x1E{"record":2}\x0A
\x1E{"record":3}\x0A

// Format breakdown:
// \x1E = ASCII Record Separator (RS)
// {...} = JSON object
// \x0A = ASCII Line Feed (LF)
```

## Use Cases

### Middleware Identification

```ts
// Middleware can now accurately detect JSON streaming
const streamingMiddleware = (req, res, next) => {
  const originalSend = res.send

  res.send = function (data) {
    const contentType = res.get('Content-Type')
    const xContentType = res.get('X-Content-Type')

    if (xContentType === 'application/json-seq') {
      // This is a JSON Text Sequence stream
      console.log('Streaming JSON response detected')

      // Apply streaming-specific logic
      res.set('Cache-Control', 'no-cache')
      res.set('Connection', 'keep-alive')
    } else if (contentType === 'text/plain') {
      // This is regular plain text
      console.log('Plain text response detected')
    }

    return originalSend.call(this, data)
  }

  next()
}
```

### Monitoring and Analytics

```ts
// Analytics middleware can categorize responses
const analyticsMiddleware = (req, res, next) => {
  res.on('finish', () => {
    const xContentType = res.get('X-Content-Type')

    if (xContentType === 'application/json-seq') {
      // Track streaming JSON responses
      analytics.track('response.streaming_json', {
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
        responseTime: Date.now() - req.startTime,
      })
    } else {
      // Track regular responses
      analytics.track('response.regular', {
        path: req.path,
        method: req.method,
        contentType: res.get('Content-Type'),
        statusCode: res.statusCode,
      })
    }
  })

  next()
}
```

### Logging Enhancement

```ts
// Enhanced logging with response type detection
const loggingMiddleware = (req, res, next) => {
  const originalEnd = res.end

  res.end = function (chunk, encoding) {
    const xContentType = res.get('X-Content-Type')
    const contentType = res.get('Content-Type')

    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      contentType,
      responseType:
        xContentType === 'application/json-seq' ? 'streaming_json' : 'regular',
      timestamp: new Date().toISOString(),
    }

    if (xContentType === 'application/json-seq') {
      logger.info('Streaming JSON response completed', logData)
    } else {
      logger.info('Response completed', logData)
    }

    return originalEnd.call(this, chunk, encoding)
  }

  next()
}
```

### Proxy Configuration

```ts
// Reverse proxy can handle streaming responses differently
const proxyMiddleware = (req, res, next) => {
  // Check if this will be a streaming response
  const handleResponse = proxyRes => {
    const xContentType = proxyRes.headers['x-content-type']

    if (xContentType === 'application/json-seq') {
      // Configure for streaming
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate')
      res.set('Pragma', 'no-cache')
      res.set('Expires', '0')

      // Disable buffering
      res.set('X-Accel-Buffering', 'no') // Nginx
      res.set('X-Proxy-Buffering', 'no') // Custom proxies
    }
  }

  proxy.web(req, res, {
    target: 'http://backend-server',
    onProxyRes: handleResponse,
  })
}
```

### Content Negotiation

```ts
// API gateway can route based on response type
const routingMiddleware = (req, res, next) => {
  const originalSetHeader = res.setHeader

  res.setHeader = function (name, value) {
    if (
      name.toLowerCase() === 'x-content-type' &&
      value === 'application/json-seq'
    ) {
      // Route streaming responses to specialized handlers
      req.isStreamingResponse = true

      // Apply streaming-specific headers
      this.setHeader('Access-Control-Allow-Origin', '*')
      this.setHeader('Access-Control-Expose-Headers', 'X-Content-Type')
    }

    return originalSetHeader.call(this, name, value)
  }

  next()
}
```

## Client-Side Handling

### Browser JavaScript

```js
// Client can detect streaming responses
fetch('/api/stream').then(response => {
  const xContentType = response.headers.get('X-Content-Type')

  if (xContentType === 'application/json-seq') {
    // Handle as streaming JSON
    return handleStreamingJSON(response)
  } else {
    // Handle as regular response
    return response.text()
  }
})

function handleStreamingJSON(response) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  return new ReadableStream({
    start(controller) {
      function pump() {
        return reader.read().then(({ done, value }) => {
          if (done) {
            controller.close()
            return
          }

          // Parse JSON Text Sequence format
          const text = decoder.decode(value, { stream: true })
          const lines = text.split('\x0A')

          for (const line of lines) {
            if (line.startsWith('\x1E')) {
              const json = line.substring(1)
              if (json.trim()) {
                try {
                  const obj = JSON.parse(json)
                  controller.enqueue(obj)
                } catch (e) {
                  console.warn('Failed to parse JSON:', json)
                }
              }
            }
          }

          return pump()
        })
      }

      return pump()
    },
  })
}
```

### Node.js Client

```js
// Node.js client with streaming detection
const https = require('https')

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.example.com',
        path,
        method: 'GET',
      },
      res => {
        const xContentType = res.headers['x-content-type']

        if (xContentType === 'application/json-seq') {
          // Handle streaming response
          const stream = new JSONSequenceParser()
          res.pipe(stream)
          resolve(stream)
        } else {
          // Handle regular response
          let data = ''
          res.on('data', chunk => (data += chunk))
          res.on('end', () => resolve(data))
        }
      }
    )

    req.on('error', reject)
    req.end()
  })
}
```

## Comparison with Previous Behavior

### Before (No X-Content-Type)

```http
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Transfer-Encoding: chunked

\x1E{"data":"value"}\x0A
```

**Problems:**

- Middleware couldn't distinguish JSON streams from plain text
- Monitoring systems categorized all as "text/plain"
- Custom processing required content inspection
- False positives with actual plain text responses

### After (With X-Content-Type)

```http
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
X-Content-Type: application/json-seq
Transfer-Encoding: chunked

\x1E{"data":"value"}\x0A
```

**Benefits:**

- Clear identification of JSON streaming responses
- Accurate categorization in monitoring systems
- Middleware can apply appropriate processing
- No false positives with plain text responses

## Integration with Existing Features

### JsonStream Class

```ts
// JsonStream responses automatically get the header
import { route, JsonStream } from '@alien-rpc/service'

export const streamData = route.get('/data/stream', async () => {
  const stream = new JsonStream<{ id: number; value: string }>()

  // Response will automatically include:
  // Content-Type: text/plain; charset=utf-8
  // X-Content-Type: application/json-seq

  setTimeout(async () => {
    await stream.write({ id: 1, value: 'first' })
    await stream.write({ id: 2, value: 'second' })
    await stream.close()
  }, 100)

  return stream
})
```

### Generator Functions

```ts
// Async generator routes also get the header
export const streamItems = route.get('/items/stream', async function* () {
  // Response will include X-Content-Type: application/json-seq

  for (let i = 1; i <= 10; i++) {
    yield { id: i, name: `Item ${i}` }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
})
```

### WebSocket Integration

```ts
// WebSocket routes that return streams also benefit
export const wsStream = route.ws(async (params: { topic: string }, ctx) => {
  const stream = new JsonStream<{ message: string }>()

  // When consumed over HTTP, gets X-Content-Type header
  // When consumed over WebSocket, header is not applicable

  return stream
})
```

## Monitoring and Observability

### Metrics Collection

```ts
// Collect metrics based on response type
const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - startTime
    const xContentType = res.get('X-Content-Type')

    if (xContentType === 'application/json-seq') {
      metrics.histogram('response.streaming_json.duration', duration, {
        method: req.method,
        path: req.route?.path || req.path,
        status: res.statusCode,
      })

      metrics.counter('response.streaming_json.count', 1, {
        method: req.method,
        status: res.statusCode,
      })
    } else {
      metrics.histogram('response.regular.duration', duration, {
        method: req.method,
        path: req.route?.path || req.path,
        status: res.statusCode,
        contentType: res.get('Content-Type'),
      })
    }
  })

  next()
}
```

### Health Checks

```ts
// Health check can verify streaming endpoints
const healthCheck = {
  async checkStreamingEndpoints() {
    const endpoints = ['/api/events/stream', '/api/data/stream']
    const results = []

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, { method: 'HEAD' })
        const xContentType = response.headers.get('X-Content-Type')

        results.push({
          endpoint,
          status: response.status,
          isStreaming: xContentType === 'application/json-seq',
          healthy: response.ok && xContentType === 'application/json-seq',
        })
      } catch (error) {
        results.push({
          endpoint,
          error: error.message,
          healthy: false,
        })
      }
    }

    return results
  },
}
```

### Error Tracking

```ts
// Track errors differently for streaming vs regular responses
const errorTrackingMiddleware = (err, req, res, next) => {
  const xContentType = res.get('X-Content-Type')

  const errorContext = {
    path: req.path,
    method: req.method,
    userAgent: req.get('User-Agent'),
    responseType:
      xContentType === 'application/json-seq' ? 'streaming_json' : 'regular',
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
    },
  }

  if (xContentType === 'application/json-seq') {
    // Streaming errors might need special handling
    logger.error('Streaming response error', errorContext)

    // Check if headers were already sent
    if (res.headersSent) {
      // Error occurred during streaming
      errorTracker.track('streaming_error_during_response', errorContext)
    } else {
      // Error occurred before streaming started
      errorTracker.track('streaming_error_before_response', errorContext)
    }
  } else {
    logger.error('Regular response error', errorContext)
    errorTracker.track('regular_error', errorContext)
  }

  next(err)
}
```

## Security Considerations

### Header Exposure

```ts
// X-Content-Type header is safe to expose
const corsMiddleware = (req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*')
  res.set(
    'Access-Control-Expose-Headers',
    [
      'Content-Type',
      'X-Content-Type', // ← Safe to expose
      'Content-Length',
    ].join(', ')
  )

  next()
}
```

### Information Disclosure

- **No sensitive data** - Header only indicates response format
- **Standard practice** - X- headers are commonly used for metadata
- **Client benefit** - Helps clients handle responses appropriately
- **No security risk** - Does not expose internal implementation details

### Rate Limiting

```ts
// Apply different rate limits for streaming vs regular responses
const rateLimitMiddleware = (req, res, next) => {
  const originalSetHeader = res.setHeader

  res.setHeader = function (name, value) {
    if (
      name.toLowerCase() === 'x-content-type' &&
      value === 'application/json-seq'
    ) {
      // Apply streaming-specific rate limits
      req.isStreamingResponse = true
    }

    return originalSetHeader.call(this, name, value)
  }

  // Different limits for streaming vs regular
  const limit = req.isStreamingResponse ? 10 : 100 // requests per minute

  if (isRateLimited(req.ip, limit)) {
    return res.status(429).json({ error: 'Rate limit exceeded' })
  }

  next()
}
```

## Performance Impact

### Header Overhead

- **Minimal impact** - Single additional header (~30 bytes)
- **No processing cost** - Simple string assignment
- **Network overhead** - Negligible compared to response body
- **Caching friendly** - Header is consistent for same route types

### Middleware Processing

```ts
// Efficient header checking
const efficientMiddleware = (req, res, next) => {
  // Fast header lookup (O(1))
  const isStreaming = res.get('X-Content-Type') === 'application/json-seq'

  if (isStreaming) {
    // Apply streaming-specific logic only when needed
    applyStreamingConfiguration(res)
  }

  next()
}
```

### Memory Usage

- **No additional memory** - Header is part of existing response object
- **String interning** - Same header value reused across responses
- **Garbage collection** - No impact on GC pressure

## Testing Considerations

### Unit Testing

```ts
// Test header presence in streaming responses
describe('JSON sequence responses', () => {
  it('should include X-Content-Type header', async () => {
    const response = await request(app).get('/api/stream').expect(200)

    expect(response.headers['content-type']).toBe('text/plain; charset=utf-8')
    expect(response.headers['x-content-type']).toBe('application/json-seq')
  })

  it('should not include X-Content-Type for regular responses', async () => {
    const response = await request(app).get('/api/regular').expect(200)

    expect(response.headers['content-type']).toBe('application/json')
    expect(response.headers['x-content-type']).toBeUndefined()
  })
})
```

### Integration Testing

```ts
// Test middleware behavior with header
describe('Middleware integration', () => {
  it('should detect streaming responses', async () => {
    const detectedTypes = []

    app.use((req, res, next) => {
      res.on('finish', () => {
        const xContentType = res.get('X-Content-Type')
        detectedTypes.push(xContentType || 'none')
      })
      next()
    })

    await request(app).get('/api/stream').expect(200)
    await request(app).get('/api/regular').expect(200)

    expect(detectedTypes).toEqual(['application/json-seq', 'none'])
  })
})
```

### End-to-End Testing

```ts
// Test client handling of header
describe('Client integration', () => {
  it('should handle streaming responses correctly', async () => {
    const client = defineClient(routes)
    const items = []

    for await (const item of client.streamData()) {
      items.push(item)
    }

    expect(items.length).toBeGreaterThan(0)
    expect(items[0]).toHaveProperty('id')
    expect(items[0]).toHaveProperty('value')
  })
})
```

## Migration from Previous Versions

### No Breaking Changes

```ts
// Existing code continues to work unchanged
export const existingStream = route.get('/existing/stream', async function* () {
  yield { data: 'value1' }
  yield { data: 'value2' }
})

// Automatically gets new header:
// Content-Type: text/plain; charset=utf-8
// X-Content-Type: application/json-seq
```

### Middleware Updates (Optional)

```ts
// Existing middleware continues to work
const existingMiddleware = (req, res, next) => {
  console.log('Content-Type:', res.get('Content-Type'))
  next()
}

// Can be enhanced to use new header
const enhancedMiddleware = (req, res, next) => {
  const contentType = res.get('Content-Type')
  const xContentType = res.get('X-Content-Type')

  console.log('Content-Type:', contentType)
  if (xContentType) {
    console.log('X-Content-Type:', xContentType)
  }

  next()
}
```

### Gradual Adoption

```ts
// Teams can gradually update middleware to use new header
const adaptiveMiddleware = (req, res, next) => {
  const xContentType = res.get('X-Content-Type')
  const contentType = res.get('Content-Type')

  // Use X-Content-Type if available, fall back to Content-Type
  const responseType = xContentType || contentType

  if (responseType === 'application/json-seq') {
    // Handle streaming JSON
    handleStreamingResponse(req, res)
  } else if (contentType === 'text/plain' && !xContentType) {
    // Legacy streaming response or actual plain text
    // Could inspect content to determine type
    handleLegacyResponse(req, res)
  }

  next()
}
```

## Related Changes

### JSON Sequence Evolution

- **JSON sequence error forwarding** (commit 340045e) - Error handling in streams
- **JsonStream class** (commit d9e2e94) - Streaming response implementation
- **JsonStream#abort method** (commit bd33be6) - Stream termination capabilities

### Content Type Standards

- **RFC 7464** - JSON Text Sequences specification
- **MIME types** - Standard content type definitions
- **X- headers** - Extension header conventions

### Future Considerations

- **Standardization** - If `application/json-seq` becomes standardized, could migrate primary Content-Type
- **Header consolidation** - Potential future consolidation of headers
- **Client libraries** - Enhanced client support for header-based detection

## References

**Files Modified:**

- `packages/service/src/responders/json-seq.ts` - Added `X-Content-Type: application/json-seq` header

**Related Documentation:**

- [JsonStream Class](./service-jsonstream-class.md) - Streaming response implementation
- [JSON Sequence Error Forwarding](./2024-12-19_340045e_json-seq-error-forwarding.md) - Error handling in streams
- [JsonStream#abort Method](./service-jsonstream-abort-method.md) - Stream termination

**Standards References:**

- [RFC 7464 - JSON Text Sequences](https://www.rfc-editor.org/rfc/rfc7464.html) - JSON streaming format
- [RFC 7231 - HTTP/1.1 Semantics](https://www.rfc-editor.org/rfc/rfc7231.html#section-3.1.1.1) - Content-Type header
- [RFC 6648 - Deprecating X-](https://www.rfc-editor.org/rfc/rfc6648.html) - X- header conventions

**Best Practices:**

- Use `X-Content-Type` header for middleware identification of JSON streams
- Maintain `text/plain` as primary Content-Type for compatibility
- Implement middleware that gracefully handles both header presence and absence
- Monitor response types using the new header for better observability
