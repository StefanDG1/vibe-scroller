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
import type * as aiPreferences from "../aiPreferences.js";
import type * as assets from "../assets.js";
import type * as billing from "../billing.js";
import type * as billingChanges from "../billingChanges.js";
import type * as billingV1 from "../billingV1.js";
import type * as categories from "../categories.js";
import type * as cloud from "../cloud.js";
import type * as commerce from "../commerce.js";
import type * as credentialRotation from "../credentialRotation.js";
import type * as crons from "../crons.js";
import type * as devices from "../devices.js";
import type * as email from "../email.js";
import type * as gateway from "../gateway.js";
import type * as githubEvents from "../githubEvents.js";
import type * as githubLinks from "../githubLinks.js";
import type * as githubOAuth from "../githubOAuth.js";
import type * as http from "../http.js";
import type * as identity from "../identity.js";
import type * as imports from "../imports.js";
import type * as inferenceBudget from "../inferenceBudget.js";
import type * as integrations from "../integrations.js";
import type * as invoiceAccounting from "../invoiceAccounting.js";
import type * as invoiceOperations from "../invoiceOperations.js";
import type * as jobs from "../jobs.js";
import type * as lib from "../lib.js";
import type * as lib_cloudAccess from "../lib/cloudAccess.js";
import type * as lib_deletionMarkers from "../lib/deletionMarkers.js";
import type * as lib_githubAuthorization from "../lib/githubAuthorization.js";
import type * as lib_inference from "../lib/inference.js";
import type * as lib_invoiceOperator from "../lib/invoiceOperator.js";
import type * as lib_personalAccess from "../lib/personalAccess.js";
import type * as lib_prObservation from "../lib/prObservation.js";
import type * as limitsV1 from "../limitsV1.js";
import type * as localResults from "../localResults.js";
import type * as maintenance from "../maintenance.js";
import type * as media from "../media.js";
import type * as organizations from "../organizations.js";
import type * as payments from "../payments.js";
import type * as personalAnalysis from "../personalAnalysis.js";
import type * as personalMedia from "../personalMedia.js";
import type * as personalMediaState from "../personalMediaState.js";
import type * as planning from "../planning.js";
import type * as privacy from "../privacy.js";
import type * as product from "../product.js";
import type * as productSchema from "../productSchema.js";
import type * as profiles from "../profiles.js";
import type * as projects from "../projects.js";
import type * as reconciliation from "../reconciliation.js";
import type * as recovery from "../recovery.js";
import type * as recoveryStorage from "../recoveryStorage.js";
import type * as retrieval from "../retrieval.js";
import type * as runnerProtocol from "../runnerProtocol.js";
import type * as sandboxBroker from "../sandboxBroker.js";
import type * as settlementAccounting from "../settlementAccounting.js";
import type * as workflows from "../workflows.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  aiPreferences: typeof aiPreferences;
  assets: typeof assets;
  billing: typeof billing;
  billingChanges: typeof billingChanges;
  billingV1: typeof billingV1;
  categories: typeof categories;
  cloud: typeof cloud;
  commerce: typeof commerce;
  credentialRotation: typeof credentialRotation;
  crons: typeof crons;
  devices: typeof devices;
  email: typeof email;
  gateway: typeof gateway;
  githubEvents: typeof githubEvents;
  githubLinks: typeof githubLinks;
  githubOAuth: typeof githubOAuth;
  http: typeof http;
  identity: typeof identity;
  imports: typeof imports;
  inferenceBudget: typeof inferenceBudget;
  integrations: typeof integrations;
  invoiceAccounting: typeof invoiceAccounting;
  invoiceOperations: typeof invoiceOperations;
  jobs: typeof jobs;
  lib: typeof lib;
  "lib/cloudAccess": typeof lib_cloudAccess;
  "lib/deletionMarkers": typeof lib_deletionMarkers;
  "lib/githubAuthorization": typeof lib_githubAuthorization;
  "lib/inference": typeof lib_inference;
  "lib/invoiceOperator": typeof lib_invoiceOperator;
  "lib/personalAccess": typeof lib_personalAccess;
  "lib/prObservation": typeof lib_prObservation;
  limitsV1: typeof limitsV1;
  localResults: typeof localResults;
  maintenance: typeof maintenance;
  media: typeof media;
  organizations: typeof organizations;
  payments: typeof payments;
  personalAnalysis: typeof personalAnalysis;
  personalMedia: typeof personalMedia;
  personalMediaState: typeof personalMediaState;
  planning: typeof planning;
  privacy: typeof privacy;
  product: typeof product;
  productSchema: typeof productSchema;
  profiles: typeof profiles;
  projects: typeof projects;
  reconciliation: typeof reconciliation;
  recovery: typeof recovery;
  recoveryStorage: typeof recoveryStorage;
  retrieval: typeof retrieval;
  runnerProtocol: typeof runnerProtocol;
  sandboxBroker: typeof sandboxBroker;
  settlementAccounting: typeof settlementAccounting;
  workflows: typeof workflows;
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

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
};
