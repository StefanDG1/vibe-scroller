// Vitest mocks this Next.js build marker while exercising server wrappers in Node.
// Next.js still enforces the actual client/server boundary in production builds.
declare module "server-only";
