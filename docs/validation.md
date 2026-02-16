# Validation and Coercion

`alien-rpc` provides two ways to validate incoming data: TypeScript-native constraints and explicit TypeBox schemas.

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

## Path Parameter Coercion

By default, path parameters are strings. To coerce them to other types, you must provide a `pathSchema` to the route definition using helpers from `alien-rpc/service/typebox`.

```typescript
import { NumberParam, DateString } from 'alien-rpc/service/typebox'
import * as Type from '@sinclair/typebox'

export const getPost = route('/post/:id').get(
  {
    pathSchema: Type.Object({
      id: NumberParam()
    })
  },
  async (id: number) => {
    // id is guaranteed to be a number
  }
)
```

## Manual Schemas

For more complex validation, you can provide an explicit `requestSchema` (for the request body/search params) or `pathSchema` (for path parameters) using TypeBox.

```typescript
import * as Type from '@sinclair/typebox'

export const updateItems = route('/items').post(
  {
    requestSchema: Type.Object({
      ids: Type.Array(Type.String())
    })
  },
  async ({ ids }) => {
    // ...
  }
)
```
