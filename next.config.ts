import type { NextConfig } from "next";

// Cabeceras de seguridad para todas las rutas. HTTPS (HSTS) lo agrega Vercel.
// La CSP no restringe scripts: hacerlo con nonces obligaría a generar cada página en cada visita.
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    // Ninguna otra web puede mostrar la app dentro de un marco (evita clickjacking en /admin).
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  { key: "X-Frame-Options", value: "DENY" }, // navegadores antiguos que no leen frame-ancestors
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // La app no usa cámara, micrófono ni ubicación.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
