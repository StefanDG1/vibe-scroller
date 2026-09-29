import type { NextConfig } from "next";
const config: NextConfig = {
  transpilePackages: [
    "@companynerve/ui",
    "@companynerve/company-config",
    "@companynerve/design-recipes",
  ],
  poweredByHeader: false,
};
export default config;
