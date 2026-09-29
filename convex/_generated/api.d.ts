/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts from "../accounts.js";
import type * as billing from "../billing.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as identity from "../identity.js";
import type * as lib from "../lib.js";
import type * as maintenance from "../maintenance.js";
import type * as organizations from "../organizations.js";
import type * as payments from "../payments.js";
import type * as projects from "../projects.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  billing: typeof billing;
  crons: typeof crons;
  http: typeof http;
  identity: typeof identity;
  lib: typeof lib;
  maintenance: typeof maintenance;
  organizations: typeof organizations;
  payments: typeof payments;
  projects: typeof projects;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
