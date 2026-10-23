import type { MetadataRoute } from "next";

/** /manifest.webmanifest: lets phones install Konnect to the home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Konnect",
    short_name: "Konnect",
    description: "Share moments, follow friends, and chat in real time.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
