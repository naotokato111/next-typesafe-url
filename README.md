# next-typesafe-url

JSON serializable, fully typesafe, and [zod](https://www.npmjs.com/package/zod) validated URL search params, dynamic route params, and routing for NextJS pages directory.

**Big shoutout to [tanstack/router](https://github.com/tanstack/router) and [yesmeck/remix-routes](https://github.com/yesmeck/remix-routes) for inspiration and ideas.**

## Whats wrong with curent solutions?

### Routing

Next.js's non-typesafe routing can lead to runtime errors and make it difficult to catch routing-related issues during development, as it relies on string literals instead of type-safe constructs.

### Search Params

_from [tanstack/router](https://tanstack.com/router/v1/docs/guide/search-params):_

Traditional Search Param APIs usually assume a few things:

- Search params are always strings
- They are mostly flat
- Serializing and deserializing using URLSearchParams is good enough (Spoiler alert: it's not, it sucks)

## Typesafety Isn’t Optional

### How does `next-typesafe-url` solve these problems?

- **Fully typesafe routing-** all the way from the route, to the route params, to the search params
- Search params are JSON-first, so you can pass strings, numbers, booleans, nulls, **and even nested objects and arrays**
- Search and route params are validated at runtime using zod, so you can be sure that **the data you get matches the schema you expect**

## Installation

```bash
npm install next-typesafe-url
# or
yarn add next-typesafe-url
# or
pnpm add next-typesafe-url
```

## Setup

### IMPORTANT NOTE

**This package requires you to run your npm scripts from the root directory of your project, as well as your `pages` directory being in `root/src`.**

---

If you run into any issues it will most likely be the cli (_for me it works fine on my setup, but when using it in a github codespace the watch functionality wouldn't work_).

**Assuming you have the correct directory structure as listed above**, a quick `npx next-typesafe-url` should generate the types and you'll be all set.

_If the functions still show type errors, you can restart typescript server, but I have found a quick `crtl+click` to go the origin type file can often wake the ts server up much faster._

Worst case senario, you may have to restart your editor. If you are still having issues, please open an issue.

---

Add `next-typesafe-url` to your dev and build script in package.json.

For dev mode, you can either run it in a seperate shell, or in one with the [concurrently](https://www.npmjs.com/package/concurrently) package.

```json
{
  "scripts": {
    "build": "next-typesafe-url && next build",

    "dev": "concurrently  \"next-typesafe-url -w\" \"next dev\"",
    // OR
    "dev:url": "next-typesafe-url -w"
  }
}
```

# Usage

## Route

`next-typesafe-url` is powered by exporting a special `RouteType` type from each route in your `pages` directory. It is derived from a special `Route` object, that defines the valid route params and search params for that route.

**Note: `Route` should exclusively include the keys of either `routeParams` or `searchParams`, or both, and they must be Zod objects without exception.**

---

_If a route doesn't need any route params or search params, you dont need to define a `Route` object, or export a `RouteType` type_

Any page that does not export a `RouteType` type will be classified as a `StaticRoute`, and will throw a type error if you try to link to it with any dynamic route params or search params.

---

```ts
// pages/product/[productID].tsx

const Route = {
  routeParams: z.object({
    productID: z.number(),
  }),
  searchParams: z.object({
    location: z.enum(["us", "eu"]).optional(),
    userInfo: z.object({
      name: z.string(),
      age: z.number(),
    }),
  }),
};
export type RouteType = typeof Route;
```

---

Search params support all valid JSON types. However, **route params are not JSON serializable, so you can only pass strings, numbers, and/or booleans.** _You may also pass an array (of strings, numbers and/or booleans) for catch all routes as shown below._

---

**Note:** Catch all and optional catch all routes are interepted as arrays or tuples.

```ts
// pages/dashboard/[...options].tsx
const Route = {
  routeParams: z.object({
    options: z.tuple([z.string(), z.number()]),
  }),
};
export type RouteType = typeof Route;

// /dashboard/deployments/2 will match and return { options: ["deployments", 2] }
```

Keep in mind that `next-typesafe-url` assumes your `Route` and export `RouteType` is correct. If you for example, have a route param that is a different name than the file name, it will cause silent errors.

**Double check your `Route` objects to make sure they are correct.**

## Path

`next-typesafe-url` exports a `$path` function that generates a path that can be passed to `next/link` or `next/router`.

```tsx
import { $path } from "next-typesafe-url";

<Link
  href={$path({
    route: "/product/[productID]",
    routeParams: { productID: 23 },
    searchParams: { userInfo: { name: "bob", age: 23 } },
  })}
/>;

// this generates the following string:
// "/product/23?userInfo=%7B%22name%22%3A%22bob%22%2C%22age%22%3A23%7D"
```

If the route is not a valid route, or any of the route params or search params are missing or of the wrong type, it will throw a type error.

---

**Note:** Strings are passed to the url without quotes, so to provide support for booleans, nulls and numbers there are reserved keywords that are converted to their respective values.

Those keywords are:

- `"true"` -> `true`
- `"false"` -> `false`
- `"null"` -> `null`
- `"<some_numberic_literal>"` -> `number`

**`"undefined"` is not a special keyword**, and will be interpreted as a string if passed as the value of a search param in the URL.

In `$path`, passing undefined as the value of a search param will cause it to be left out of the path.

```typescript

$path({ route: "/" searchParams: { foo: undefined, bar: true } }) // => "/?bar=true"

// ------------------------

// URL: /?bar=undefined
// value of bar will be the string "undefined", not undefined
```

---

## Hooks

`next-typesafe-url` exports a `useRouteParams` and `useSearchParams` hook that will return the route params / search params for the current route. They take one argument, the zod schema for either route params or search params from the Route object.

```tsx
const params = useSearchParams(Route.searchParams);
const { data, isValid, isReady, isError, error } = params;

// if isReady is true, and isError is false (isValid is true), then data *will* be in the shape of Route.searchParams
// in this case, data will be { userInfo: { name: string, age: number } }

if (!isReady) {
  return <div>loading...</div>;
} else if (isError) {
  return <div>Invalid search params {error.message}</div>;
} else if (isValid) {
  return <div>{data.userInfo.name}</div>;
}
```

`isReady` is the internal state of next/router, and `isError` is a boolean that is true if the params do not match the schema. If `isError` is true, then `error` will be a zod error object you can use to get more information about the error. (_also check out [zod-validation-error](https://github.com/causaly/zod-validation-error) to get a nice error message_)

**If `isReady` is true and `isError` is false, then `data` will always be valid and match the schema.**

_For convenience, instead of needing checking `isReady && !isError`, I have added the `isValid` flag which is only true when `isReady` is `true` and and `isError` is false._

## Reccomended Usage

### **It is _HIGHLY_ reccomended to only call `useSearchParams` and `useRouteParams` in the top level component of each route, and pass the data down to child components through props or context.**

Feel free to use your state management library of choice to pass the data down to child components.

## Static/SeverSide Props

`next-typesafe-url` provides full support for validating route params and search params in `getStaticProps` and `getServerSideProps`.

Use the `InferServerSideParamsType` to get the type of the route params and search params for the current route, we can pass that type as a generic to `NextPage` and `GetStaticProps` or `GetServerSideProps`.

If you are passing other props in `getStaticProps` or `getServerSideProps`, just create a union type with the `InferServerSideParamsType` type.

The `parseServerSideRouteParams` and `parseServerSideSearchParams` functions are used to parse the route params and search params. They take the same schema from your `Route` object as the `useRouteParams` and `useSearchParams` hooks, as well as the `context` object from `getStaticProps` or `getServerSideProps`.

### Errors

Like the hooks, `parseServerSideRouteParams` and `parseServerSideSearchParams` have an `isError` flag, and if it is true, then `error` will be a zod error object you can use to get more information about the error. Otherwise, `data` will be the parsed route params or search params.

---

This is an example of how to use `next-typesafe-url` with `getServerSideProps`, but the same pattern can be used with `getStaticProps`.

```tsx
import type {
  InferGetServerSidePropsType,
  NextPage,
  GetServerSideProps,
} from "next";
import { z } from "zod";
import {
  $path,
  parseServerSideRouteParams,
  parseServerSideSearchParams,
  type InferServerSideParamsType,
} from "next-typesafe-url";

const Route = {
  routeParams: z.object({
    productID: z.number(),
  }),
  searchParams: z.object({
    location: z.enum(["us", "eu"]).optional(),
    userInfo: z.object({
      name: z.string(),
      age: z.number(),
    }),
  }),
};
export type RouteType = typeof Route;

type ServerSideProps = InferServerSideParamsType<RouteType>;

export const getServerSideProps: GetServerSideProps<ServerSideProps> = async (
  context
) => {
  const routeParams = parseServerSideRouteParams({
    context,
    validator: Route.routeParams,
  });

  const searchParams = parseServerSideSearchParams({
    context,
    validator: Route.searchParams,
  });

  if (routeParams.isError || searchParams.isError) {
    console.log(routeParams.error?.message, searchParams.error?.message);
    throw new Error("Invalid route or search params");
  } else {
    return {
      props: {
        ...routeParams.data,
        ...searchParams.data,
      },
    };
  }
};

type PageProps = InferGetServerSidePropsType<typeof getServerSideProps>;

const Page: NextPage<PageProps> = (props) => {
  return (
    <>
      <div>slug: {props.slug}</div>
      <div>search: {`${props.userInfo.name} - ${props.userInfo.age}`}</div>
      <div>location: {props.location}</div>
    </>
  );
};
export default Page;
```

## AppRouter Type

`next-typesafe-url` exports a `AppRouter` type that you can use to get the type of the valid search params and route params for any given route in your app.

```tsx
import { type AppRouter } from "next-typesafe-url";

type ProductIDRouteParams = AppRouter["/product/[productID]"]["routeParams"];
// type ProductIDRouteParams = {
//     productID: number;
// }
```

## Command Line Options

- `-w`: Watch for changes and automatically rebuild.

## License

[MIT](LICENSE)

# TODO

- add tests
- `app` router support
- [`remix-routes` style typescript plugin](https://github.com/yesmeck/remix-routes/tree/master/packages/typescript-remix-routes-plugin) to improve autocomplete and add 'go to definition' to route string (would take you to the route file)
