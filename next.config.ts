import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // permite rodar um build de verificação sem mexer no .next do servidor de dev
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
