# Validation and Coercion

`alien-rpc` uses your TypeScript type definitions to automatically generate runtime validation and coercion. This ensures that the data your handlers receive matches the types you've defined.

## Type-based Constraints

You can use the `t` namespace from `alien-rpc/service` to add validation rules directly to your TypeScript types. The CLI generator will convert these into [TypeBox](https://github.com/sinclairzx81/typebox) schemas.

### String Constraints

- `t.MinLength<N>`
- `t.MaxLength<N>`
- `t.Pattern<Regex>`
- `t.Format<'url' | 'email' | 'date-time' | ...>`

```typescript
import type { t } from 'alien-rpc/service'

type UserProfile = {
  username: string & t.MinLength<3> & t.MaxLength<20>
  email: string & t.Format<'email'>
}
```

### Number Constraints

- `t.Minimum<N>`
- `t.Maximum<N>`
- `t.ExclusiveMinimum<N>`
- `t.ExclusiveMaximum<N>`
- `t.MultipleOf<N>`

### Array Constraints

- `t.MinItems<N>`
- `t.MaxItems<N>`
- `t.UniqueItems<boolean>`

## Request Body and Query Parameters

The second argument of your route handler is also automatically validated and coerced based on its TypeScript type.

- For **GET** requests, this argument represents the **query parameters**.
- For **other** methods (POST, PUT, etc.), it represents the **JSON request body**.

```typescript
// Query parameter validation
export const search = route('/search').get(
  async ({ query, limit = 10 }: { query: string; limit?: number }) => {
    // query is a string, limit is a number
  }
)

// Request body validation
export const createPost = route('/posts').post(
  async ({ title, content }: { title: string; content: string }) => {
    // title and content are validated at runtime
  }
)
```

## Path Parameter Coercion

Path parameters are automatically coerced based on the types defined in your handler's signature. Supported types include `string`, `number`, `boolean`, and `Date`.

```typescript
export const getPost = route('/post/:id').get(
  async (id: number) => {
    // id is guaranteed to be a number
  }
)
```
