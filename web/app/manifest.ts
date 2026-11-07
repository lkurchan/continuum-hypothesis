import type { MetadataRoute } from "next";

// Light PWA (PRD 6): installable, no service worker and no offline mode.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Continuum",
    short_name: "Continuum",
    description: "Cobrá lo que trabajás, segundo a segundo.",
    start_url: "/worker",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFFFFF",
    theme_color: "#0B0B0C",
    lang: "es-AR",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
