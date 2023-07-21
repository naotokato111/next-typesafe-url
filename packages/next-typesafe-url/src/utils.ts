import { ReadonlyURLSearchParams, useParams } from "next/navigation";
import type { NextRouter } from "next/router";

// * TESTED
/**
 * Encodes a value to be used in a URL. If the value is a object or array, it is first stringified.
 *
 * @throws If the value is not a non-empty string, number, boolean, array, object, or null.
 */
export function encodeValue(value: unknown): string {
  if (typeof value === "string" && value !== "") {
    return encodeURIComponent(value);
  } else if (typeof value === "number" || typeof value === "boolean") {
    return encodeURIComponent(value.toString());
  } else if (
    Array.isArray(value) ||
    typeof value === "object" ||
    value === null
  ) {
    return encodeURIComponent(JSON.stringify(value));
  } else {
    throw new Error(
      "only null, non-empty string, number, boolean, array, and object are able to be encoded"
    );
  }
}

export function generateParamStringFromSearchParamObj(
  obj: Record<string, unknown>
): string {
  const params: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    params.push(`${key}${value === undefined ? "" : `=${encodeValue(value)}`}`);
  }

  const finalString = `?${params.join("&")}`;
  return finalString === "?" ? "" : finalString;
}

/**
 * Safely parses a JSON string. If the string is undefined, returns undefined. If the string is not a valid JSON string, returns the string.
 */
export function safeJSONParse(value: string | undefined): unknown {
  if (value === undefined) {
    return value;
  }
  try {
    return JSON.parse(decodeURIComponent(value));
  } catch {
    return value;
  }
}

export function parseOrMapParse(
  obj: string | string[] | undefined
): unknown | unknown[] {
  if (Array.isArray(obj)) {
    return obj.map(safeJSONParse);
  } else {
    return safeJSONParse(obj);
  }
}

export function parseTopLevelObject(
  obj: Record<string, string | string[] | undefined>
): Record<string, unknown | unknown[]> {
  const result: Record<string, unknown | unknown[]> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = parseOrMapParse(value);
  }
  return result;
}

export function handleSearchParamMultipleKeys(
  urlParams: URLSearchParams | ReadonlyURLSearchParams
): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};

  urlParams.forEach((value, key) => {
    const valueAtKey = result[key];
    if (Array.isArray(valueAtKey)) {
      valueAtKey.push(value);
    } else if (valueAtKey) {
      result[key] = [valueAtKey, value];
    } else {
      result[key] = value;
    }
  });

  return result;
}

export function parseObjectFromParamString(
  paramString: string
): Record<string, unknown> {
  const params = new URLSearchParams(paramString);
  const handledParams = handleSearchParamMultipleKeys(params);
  return parseTopLevelObject(handledParams);
}

export function parseObjectFromReadonlyURLParams(
  params: ReadonlyURLSearchParams
): Record<string, unknown> {
  const handledParams = handleSearchParamMultipleKeys(params);
  return parseTopLevelObject(handledParams);
}

export function parseObjectFromUseParams(
  params: ReturnType<typeof useParams>
): Record<string, unknown> {
  return parseTopLevelObject(params);
}

export function getDynamicRouteParams(
  path: NextRouter["route"],
  query: NextRouter["query"]
): Record<string, unknown> {
  const segments = path.split("/");

  // Extract dynamic segments from the path
  const dynamicSegments = segments.filter(
    (segment) =>
      segment.startsWith("[") &&
      segment.endsWith("]") &&
      !segment.includes("...")
  );
  const optionalCatchAllSegments = segments.filter(
    (segment) =>
      segment.startsWith("[[") &&
      segment.endsWith("]]") &&
      segment.includes("...")
  );
  const catchAllSegments = segments.filter(
    (segment) =>
      segment.startsWith("[") &&
      segment.endsWith("]") &&
      segment.includes("...")
  );
  // Extract dynamic param names from dynamic segments
  const dynamicParamNames = dynamicSegments.map((segment) =>
    segment.slice(1, -1)
  );

  const optionalCatchAllParamNames = optionalCatchAllSegments.map((segment) =>
    segment.slice(5, -2)
  );

  const catchAllParamNames = catchAllSegments.map((segment) =>
    segment.slice(4, -1)
  );

  const allCatchAllNames = [
    ...optionalCatchAllParamNames,
    ...catchAllParamNames,
  ];

  const parsedCatchAll: Record<string, unknown[]> = {};

  for (const name of allCatchAllNames) {
    const value = query[name];
    const result = parseOrMapParse(value);
    parsedCatchAll[name] = Array.isArray(result) ? result : [result];
  }

  const parsedNonCatchAll: Record<string, unknown> = {};

  for (const name of dynamicParamNames) {
    const value = query[name];
    parsedNonCatchAll[name] = parseOrMapParse(value);
  }

  return { ...parsedNonCatchAll, ...parsedCatchAll };
}

type Segment = {
  type: "static" | "dynamic" | "catchAll" | "optionalCatchAll";
  value: string;
};

// * TESTED
/**
 * Takes a segment of a route and returns an object with the type of segment and the value of the segment.
 *
 * @example parseSegment("foo") -> { type: "static", value: "foo"}
 * @example parseSegment("[bar]") -> { type: "dynamic", value: "bar"}
 * @example parseSegment("[...baz]") -> { type: "catchAll", value: "baz"}
 * @example parseSegment("[[...qux]]") -> { type: "optionalCatchAll", value: "qux"}
 */
export function parseSegment(segment: string): Segment {
  if (
    segment.startsWith("[") &&
    segment.endsWith("]") &&
    !segment.includes("...")
  ) {
    // dynamic segment ie [id] -> { type: "dynamic", value: "id"}
    return {
      type: "dynamic",
      value: segment.slice(1, -1),
    };
  } else if (
    segment.startsWith("[[") &&
    segment.endsWith("]]") &&
    segment.includes("...")
  ) {
    // optional catch-all segment ie [[...id]] -> { type: "optionalCatchAll", value: "id"}
    return {
      type: "optionalCatchAll",
      value: segment.slice(5, -2),
    };
  } else if (
    segment.startsWith("[") &&
    segment.endsWith("]") &&
    segment.includes("...")
  ) {
    // catch-all segment ie [...id] -> { type: "catchAll", value: "id"}
    return {
      type: "catchAll",
      value: segment.slice(4, -1),
    };
  } else {
    // static segment ie "foo" -> { type: "static", value: "foo"}
    return {
      type: "static",
      value: segment,
    };
  }
}

// * TESTED
/**
 * Takes a route and a object, filling the dynamic segments with the corresponding values from the object after encoding them.
 *
 * @throws If a dynamic segment or catch-all segment in the route does not have a corresponding value in routeParams.
 *
 * @example encodeAndFillRoute("/foo/[bar]/[...baz]", { bar: "qux", baz: ["quux", "corge"] }) -> "/foo/qux/quux/corge"
 */
export function encodeAndFillRoute(
  route: string,
  routeParams: Record<string, unknown>
): string {
  const segments = route.split("/");
  const parsed = segments.map((e) => parseSegment(e));
  const parts: string[] = [];

  for (const segment of parsed) {
    if (segment.type === "static") {
      // static segment so just push the value
      parts.push(segment.value);
    } else if (segment.type === "dynamic") {
      // dynamic segment so get the value from the routeParams, encode it, and push it
      // if it's undefined, throw
      const paramValue = routeParams[segment.value];
      if (paramValue !== undefined) {
        parts.push(encodeValue(paramValue));
      } else {
        throw new Error(`Missing value for dynamic segment "${segment.value}"`);
      }
    } else if (segment.type === "catchAll") {
      // catch-all segment so get the value from the routeParams,
      // if its not an array, encode and push
      // if its an array, encode each item and push
      // if its undefined, throw
      const paramValue = routeParams[segment.value];
      if (Array.isArray(paramValue)) {
        parts.push(...paramValue.map((e) => encodeValue(e)));
      } else if (paramValue !== undefined) {
        parts.push(encodeValue(paramValue));
      } else {
        throw new Error(
          `Missing value for catch-all segment "${segment.value}"`
        );
      }
    } else if (segment.type === "optionalCatchAll") {
      // optional catch-all segment so get the value from the routeParams,
      // if its not an array, encode and push
      // if its an array, encode each item and push
      // if its undefined don't push anything

      const paramValue = routeParams[segment.value];
      if (Array.isArray(paramValue)) {
        parts.push(...paramValue.map((e) => encodeValue(e)));
      } else if (paramValue !== undefined) {
        parts.push(encodeValue(paramValue));
      }
    }
  }

  return parts.join("/");
}
