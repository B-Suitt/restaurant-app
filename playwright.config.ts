import { defineConfig } from "@playwright/test";

try {
  process.loadEnvFile(".env.local");
} catch {
  // En CI las variables pueden venir del entorno.
}

// Comparten la base local, así que corren de a una. Requieren Supabase local y `npm run build`.
export default defineConfig({
  testDir: "e2e",
  workers: 1,
  timeout: 300_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    channel: process.env.CI ? undefined : "msedge", // en local usa el Edge instalado, sin descargar navegadores
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
