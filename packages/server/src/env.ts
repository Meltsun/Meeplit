import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Load root .env (resolve relative to this file)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootEnv = resolve(__dirname, "../../..", ".env");
dotenv.config({ path: rootEnv });

export const WS_HOST = process.env.VITE_WS_HOST ?? "localhost";
export const WS_PORT = Number(process.env.VITE_WS_PORT ?? 3000);

export const WS_URL = `ws://${WS_HOST}:${WS_PORT}`;
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

export default { WS_HOST, WS_PORT, WS_URL, CLIENT_ORIGIN };

