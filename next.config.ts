import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next's static dependency trace can't follow our dynamic readFileSync()
  // calls into data/ (guest/property JSON + DEMO_MODE fixtures). Force the
  // bundler to include the whole data tree in the /api/agent function.
  outputFileTracingIncludes: {
    "/api/agent": ["./data/**"],
    "/api/airport-eta": ["./data/**"],
  },
};

export default nextConfig;
