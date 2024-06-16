// This file is generated by next-typesafe-url
// Do not edit this file directly.

// @generated
// prettier-ignore
/* eslint-disable */


declare module "@@@next-typesafe-url" {
  import type { InferRoute, StaticRoute } from "next-typesafe-url";
  
  interface DynamicRouter {
    "/[slug]/[...foo]": InferRoute<import("./src/pages/[slug]/[...foo]").RouteType>;
    "/[slug]/server": InferRoute<import("./src/pages/[slug]/server").RouteType>;
  }

  interface StaticRouter {
    "/": StaticRoute;
  }
}
