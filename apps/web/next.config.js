import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envsDir = resolve(__dirname, "..", "..", "envs");
const nodeEnv = process.env.NODE_ENV ?? "development";

config({ path: resolve(envsDir, `.env.${nodeEnv}`), override: false });
config({ path: resolve(envsDir, ".env.example"), override: false });

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
