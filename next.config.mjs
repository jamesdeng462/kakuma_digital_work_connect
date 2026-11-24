/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Database drivers run only on the server (Node.js runtime).
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
};

export default nextConfig;
