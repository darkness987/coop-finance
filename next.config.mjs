export default {
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  turbopack: { root: process.cwd() },
  outputFileTracingIncludes: { "/*": ["./database/data.ts"] },
};
