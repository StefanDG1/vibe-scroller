import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Authenticated product routes are dynamic and never use shared response caching.
export default defineCloudflareConfig();
