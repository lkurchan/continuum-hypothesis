import type { MetadataRoute } from "next";

// Light PWA (PRD 6): installable, no service worker and no offline mode.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Continuum",
    short_name: "Continuum",
    description: "Pagos continuos entre empresas por servicios.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#0B0B0C",
    lang: "es-AR",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
