/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone", // Required for Docker multi-stage build
  // Silence noisy "missing env" build warnings for optional secrets
  env: {
    NEXT_PUBLIC_SUPABASE_URL:       process.env.NEXT_PUBLIC_SUPABASE_URL       ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY  ?? "",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE ?? "",
  },
};

export default nextConfig;

