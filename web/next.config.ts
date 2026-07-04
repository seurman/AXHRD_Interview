import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // monorepo 루트 lockfile 오인 방지 (D:\HR_IN_Solution vs web)
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ["pdf-parse", "mammoth", "word-extractor", "bcryptjs"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

export default nextConfig;
