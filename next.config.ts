import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Incluye los TTF de marca (Anton/Oswald) en el bundle serverless de los
  // endpoints que generan el PDF de la entrada, para que estén disponibles
  // en producción (Vercel) al registrarlos con @react-pdf/renderer.
  outputFileTracingIncludes: {
    "/api/tickets/create": ["./lib/tickets/fonts/**"],
    "/api/tickets/[id]/pdf": ["./lib/tickets/fonts/**"],
    "/api/tickets/[id]/resend": ["./lib/tickets/fonts/**"],
  },
};

export default nextConfig;
