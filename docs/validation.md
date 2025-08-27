# Validation

Learn how to use alien-rpc's type constraints for runtime validation beyond TypeScript's compile-time checks.

## Overview

alien-rpc provides runtime validation through "type tags" from the `t` namespace. These constraints are enforced at runtime using TypeBox, ensuring your API receives valid data even when TypeScript types are stripped away.

```ts
import { route, t } from '@alien-rpc/service'

// TypeScript types + runtime validation
export const createUser = route.post('/users', async (data: {
  name: string & t.MinLength<1> & t.MaxLength<100>
  email: string & t.Format<'email'>
  age: number & t.Minimum<18> & t.Maximum<120>
}) => {
  // data is guaranteed to be valid at runtime
  return await db.users.create(data)
})
```

## String Constraints

### Length Constraints

```ts
export const updateProfile = route.patch('/profile', async (data: {
  // Minimum length (non-empty)
  name: string & t.MinLength<1>
  
  // Maximum length
  bio: string & t.MaxLength<500>
  
  // Both min and max
  username: string & t.MinLength<3> & t.MaxLength<20>
  
  // Exact length
  zipCode: string & t.MinLength<5> & t.MaxLength<5>
}) => {
  return await db.users.updateProfile(data)
})
```

### Format Validation

```ts
export const createAccount = route.post('/accounts', async (data: {
  // Email format
  email: string & t.Format<'email'>
  
  // URI format
  website: string & t.Format<'uri'>
  
  // UUID format
  referralCode: string & t.Format<'uuid'>
  
  // Date-time format (ISO 8601)
  birthDate: string & t.Format<'date-time'>
  
  // IPv4 address
  ipAddress: string & t.Format<'ipv4'>
  
  // IPv6 address
  ipv6Address: string & t.Format<'ipv6'>
}) => {
  return await db.accounts.create(data)
})
```

### Pattern Matching

```ts
export const validateInput = route.post('/validate', async (data: {
  // Phone number pattern
  phone: string & t.Pattern<'^\\+?[1-9]\\d{1,14}$'>
  
  // Alphanumeric only
  code: string & t.Pattern<'^[a-zA-Z0-9]+$'>
  
  // Hex color
  color: string & t.Pattern<'^#[0-9a-fA-F]{6}$'>
  
  // Social security number
  ssn: string & t.Pattern<'^\\d{3}-\\d{2}-\\d{4}$'>
}) => {
  return { valid: true }
})
```

### Content Encoding and Media Type

```ts
export const uploadFile = route.post('/files', async (data: {
  // Base64 encoded content
  content: string & t.ContentEncoding<'base64'>
  
  // Media type specification
  data: string & t.ContentMediaType<'application/json'>
}) => {
  // Note: ContentEncoding and ContentMediaType are for documentation only
  // They don't perform runtime validation
  return await fileService.upload(data)
})
```

### Custom String Formats

```ts
import { addStringFormat } from '@alien-rpc/service'

// Add custom format validator
addStringFormat('slug', (value) => {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
})

// Use custom format
export const createPost = route.post('/posts', async (data: {
  title: string & t.MinLength<1>
  slug: string & t.Format<'slug'>
  content: string
}) => {
  return await db.posts.create(data)
})
```

## Number Constraints

### Range Validation

```ts
export const createProduct = route.post('/products', async (data: {
  // Minimum value (inclusive)
  price: number & t.Minimum<0>
  
  // Maximum value (inclusive)
  discount: number & t.Maximum<100>
  
  // Range validation
  rating: number & t.Minimum<1> & t.Maximum<5>
  
  // Exclusive bounds
  temperature: number & t.ExclusiveMinimum<-273.15> & t.ExclusiveMaximum<1000>
}) => {
  return await db.products.create(data)
})
```

### Multiple Validation

```ts
export const updateSettings = route.patch('/settings', async (data: {
  // Must be multiple of 5
  timeout: number & t.MultipleOf<5>
  
  // Must be even number
  batchSize: number & t.MultipleOf<2>
  
  // Must be multiple of 0.01 (2 decimal places)
  price: number & t.MultipleOf<0.01>
}) => {
  return await db.settings.update(data)
})
```

## Array Constraints

### Size Constraints

```ts
export const createPlaylist = route.post('/playlists', async (data: {
  name: string & t.MinLength<1>
  
  // Minimum array length
  tags: string[] & t.MinItems<1>
  
  // Maximum array length
  collaborators: string[] & t.MaxItems<10>
  
  // Both min and max
  songs: number[] & t.MinItems<1> & t.MaxItems<100>
}) => {
  return await db.playlists.create(data)
})
```

### Unique Items

```ts
export const assignRoles = route.post('/users/:id/roles', async (
  id: number,
  data: {
    // Array must contain unique values
    roleIds: number[] & t.UniqueItems<true>
    
    // Tags must be unique strings
    tags: string[] & t.UniqueItems<true> & t.MinItems<1>
  }
) => {
  return await db.users.assignRoles(id, data.roleIds)
})
```

### Array Item Validation

```ts
export const createBulkUsers = route.post('/users/bulk', async (data: {
  users: Array<{
    name: string & t.MinLength<1> & t.MaxLength<100>
    email: string & t.Format<'email'>
    age: number & t.Minimum<0> & t.Maximum<120>
  }> & t.MinItems<1> & t.MaxItems<50>
}) => {
  return await db.users.createMany(data.users)
})
```

## Object Constraints

### Property Count

```ts
export const updateMetadata = route.patch('/items/:id/metadata', async (
  id: number,
  data: {
    // Object must have at least 1 property
    metadata: Record<string, any> & t.MinProperties<1>
    
    // Object can have at most 10 properties
    settings: Record<string, string> & t.MaxProperties<10>
    
    // Both constraints
    config: Record<string, number> & t.MinProperties<1> & t.MaxProperties<5>
  }
) => {
  return await db.items.updateMetadata(id, data)
})
```

### Additional Properties

```ts
export const strictUpdate = route.patch('/users/:id', async (
  id: number,
  data: {
    name?: string
    email?: string
    // No additional properties allowed beyond name/email
  } & t.AdditionalProperties<false>
) => {
  return await db.users.update(id, data)
})
```

## Date and Timestamp Constraints

### Timestamp Validation

```ts
export const scheduleEvent = route.post('/events', async (data: {
  title: string
  
  // Minimum timestamp (Unix timestamp in milliseconds)
  startTime: number & t.MinimumTimestamp<Date.now()>
  
  // Maximum timestamp
  endTime: number & t.MaximumTimestamp<Date.now() + 365 * 24 * 60 * 60 * 1000>
  
  // Exclusive bounds
  reminderTime: number & t.ExclusiveMinimumTimestamp<Date.now()>
  
  // Must be multiple of 1000 (whole seconds)
  notificationTime: number & t.MultipleOfTimestamp<1000>
}) => {
  return await db.events.create(data)
})
```

### Date String Validation

```ts
export const createAppointment = route.post('/appointments', async (data: {
  // ISO date string with format validation
  date: string & t.Format<'date-time'>
  
  // You can also use Date objects directly
  createdAt: Date
  updatedAt?: Date
}) => {
  return await db.appointments.create({
    ...data,
    date: new Date(data.date)
  })
})
```

## Combining Constraints

### Multiple Constraints on Single Field

```ts
export const createUser = route.post('/users', async (data: {
  // Multiple string constraints
  username: string & t.MinLength<3> & t.MaxLength<20> & t.Pattern<'^[a-zA-Z0-9_]+$'>
  
  // Multiple number constraints
  age: number & t.Minimum<13> & t.Maximum<120> & t.MultipleOf<1>
  
  // Multiple array constraints
  interests: string[] & t.MinItems<1> & t.MaxItems<10> & t.UniqueItems<true>
}) => {
  return await db.users.create(data)
})
```

### Conditional Validation

```ts
export const createSubscription = route.post('/subscriptions', async (data: {
  type: 'free' | 'premium' | 'enterprise'
  
  // Different validation based on type
  features: string[] & (
    data.type extends 'free' 
      ? t.MaxItems<3>
      : data.type extends 'premium'
      ? t.MaxItems<10>
      : t.MaxItems<50>
  )
}) => {
  return await db.subscriptions.create(data)
})
```

## Validation Error Handling

### Understanding Validation Errors

When validation fails, alien-rpc throws a `BadRequestError` with detailed information:

```ts
// Client request that fails validation
const response = await client.createUser({
  name: '', // Fails MinLength<1>
  email: 'invalid-email', // Fails Format<'email'>
  age: -5 // Fails Minimum<0>
})

// Server receives BadRequestError with details:
// {
//   message: 'Validation failed',
//   errors: [
//     { path: '/name', message: 'String must contain at least 1 character(s)' },
//     { path: '/email', message: 'String must match email format' },
//     { path: '/age', message: 'Number must be greater than or equal to 0' }
//   ]
// }
```

### Custom Validation Messages

```ts
import { BadRequestError } from '@alien-rpc/service'

export const createUser = route.post('/users', async (data: {
  name: string & t.MinLength<1>
  email: string & t.Format<'email'>
}) => {
  // Additional custom validation
  const existingUser = await db.users.findByEmail(data.email)
  if (existingUser) {
    throw new BadRequestError('Email already exists', {
      errors: [{
        path: '/email',
        message: 'A user with this email already exists'
      }]
    })
  }
  
  return await db.users.create(data)
})
```

## Advanced Validation Patterns

### Nested Object Validation

```ts
export const createOrder = route.post('/orders', async (data: {
  customer: {
    name: string & t.MinLength<1>
    email: string & t.Format<'email'>
    address: {
      street: string & t.MinLength<1>
      city: string & t.MinLength<1>
      zipCode: string & t.Pattern<'^\\d{5}(-\\d{4})?$'>
      country: string & t.MinLength<2> & t.MaxLength<2>
    }
  }
  items: Array<{
    productId: number & t.Minimum<1>
    quantity: number & t.Minimum<1> & t.Maximum<100>
    price: number & t.Minimum<0> & t.MultipleOf<0.01>
  }> & t.MinItems<1> & t.MaxItems<50>
}) => {
  return await db.orders.create(data)
})
```

### Union Type Validation

```ts
export const processPayment = route.post('/payments', async (data: {
  method: 'card' | 'paypal' | 'bank'
  amount: number & t.Minimum<0.01> & t.MultipleOf<0.01>
  
  // Different validation based on payment method
  details: 
    | { type: 'card'; cardNumber: string & t.Pattern<'^\\d{16}$'>; cvv: string & t.Pattern<'^\\d{3,4}$'> }
    | { type: 'paypal'; email: string & t.Format<'email'> }
    | { type: 'bank'; accountNumber: string & t.Pattern<'^\\d{10,12}$'>; routingNumber: string & t.Pattern<'^\\d{9}$'> }
}) => {
  return await paymentService.process(data)
})
```

### Recursive Validation

```ts
// Note: Recursive types are not supported in route signatures
// Use flattened structures instead

// Instead of recursive comments
type Comment = {
  id: number
  content: string
  replies: Comment[] // Not supported
}

// Use flattened structure
export const createComment = route.post('/comments', async (data: {
  content: string & t.MinLength<1> & t.MaxLength<1000>
  parentId?: number & t.Minimum<1>
}) => {
  return await db.comments.create(data)
})
```

## Performance Considerations

### Validation Caching

TypeBox schemas are compiled and cached automatically:

```ts
// Schema is compiled once and reused
export const createUser = route.post('/users', async (data: {
  name: string & t.MinLength<1> & t.MaxLength<100>
  email: string & t.Format<'email'>
}) => {
  return await db.users.create(data)
})
```

### Complex Validation

For very complex validation, consider splitting into multiple routes:

```ts
// Instead of one complex route
export const complexCreate = route.post('/complex', async (data: {
  // 50+ fields with complex validation
}) => { /* ... */ })

// Split into logical groups
export const createBasicInfo = route.post('/items/basic', async (data: {
  name: string & t.MinLength<1>
  description: string
}) => { /* ... */ })

export const addAdvancedSettings = route.patch('/items/:id/advanced', async (
  id: number,
  data: {
    // Complex settings
  }
) => { /* ... */ })
```

## Testing Validation

### Unit Testing Constraints

```ts
import { validateRouteInput } from '@alien-rpc/service/testing'
import { createUser } from './routes/users.js'

describe('User validation', () => {
  it('should validate correct user data', async () => {
    const validData = {
      name: 'John Doe',
      email: 'john@example.com',
      age: 25
    }
    
    // This should not throw
    await expect(validateRouteInput(createUser, validData)).resolves.not.toThrow()
  })
  
  it('should reject invalid email', async () => {
    const invalidData = {
      name: 'John Doe',
      email: 'invalid-email',
      age: 25
    }
    
    await expect(validateRouteInput(createUser, invalidData))
      .rejects.toThrow('String must match email format')
  })
})
```

### Integration Testing

```ts
import { createTestClient } from '@alien-rpc/client/testing'
import * as API from '../client/api.js'

const client = createTestClient(API)

describe('API validation', () => {
  it('should return validation errors for invalid data', async () => {
    await expect(client.createUser({
      name: '', // Invalid
      email: 'invalid',
      age: -1
    })).rejects.toMatchObject({
      status: 400,
      message: 'Validation failed',
      errors: expect.arrayContaining([
        expect.objectContaining({ path: '/name' }),
        expect.objectContaining({ path: '/email' }),
        expect.objectContaining({ path: '/age' })
      ])
    })
  })
})
```

## Best Practices

### 1. Use Appropriate Constraints

```ts
// Good: Meaningful constraints
export const createUser = route.post('/users', async (data: {
  name: string & t.MinLength<1> & t.MaxLength<100>  // Reasonable limits
  email: string & t.Format<'email'>                // Proper format
  age: number & t.Minimum<0> & t.Maximum<120>      // Realistic range
}) => { /* ... */ })

// Bad: Overly restrictive or meaningless
export const createUser = route.post('/users', async (data: {
  name: string & t.MinLength<50> & t.MaxLength<51>  // Too restrictive
  email: string                                     // No validation
  age: number & t.Minimum<0> & t.Maximum<999999>   // Unrealistic
}) => { /* ... */ })
```

### 2. Consistent Validation

```ts
// Good: Consistent email validation across routes
type Email = string & t.Format<'email'>
type Username = string & t.MinLength<3> & t.MaxLength<20> & t.Pattern<'^[a-zA-Z0-9_]+$'>

export const createUser = route.post('/users', async (data: {
  username: Username
  email: Email
}) => { /* ... */ })

export const updateUser = route.patch('/users/:id', async (
  id: number,
  data: {
    username?: Username
    email?: Email
  }
) => { /* ... */ })
```

### 3. Clear Error Messages

```ts
// Good: Descriptive validation with custom errors
export const createUser = route.post('/users', async (data: {
  username: string & t.MinLength<3> & t.MaxLength<20> & t.Pattern<'^[a-zA-Z0-9_]+$'>
}) => {
  // Check business rules with clear messages
  const existing = await db.users.findByUsername(data.username)
  if (existing) {
    throw new BadRequestError('Username already taken', {
      errors: [{
        path: '/username',
        message: 'This username is already in use. Please choose another.'
      }]
    })
  }
  
  return await db.users.create(data)
})
```

### 4. Document Constraints

```ts
/**
 * Create a new user account
 * 
 * @param data User registration data
 * @param data.username Username (3-20 chars, alphanumeric + underscore only)
 * @param data.email Valid email address
 * @param data.password Password (min 8 chars, must include number and special char)
 */
export const createUser = route.post('/users', async (data: {
  username: string & t.MinLength<3> & t.MaxLength<20> & t.Pattern<'^[a-zA-Z0-9_]+$'>
  email: string & t.Format<'email'>
  password: string & t.MinLength<8> & t.Pattern<'(?=.*\\d)(?=.*[!@#$%^&*])'>
}) => {
  return await db.users.create(data)
})
```

---

**Next**: [Client Usage →](./client.md) | **Previous**: [Defining Routes ←](./defining-routes.md)