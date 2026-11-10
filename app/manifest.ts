import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Restivo - 3D Menu & AR Dining",
    short_name: "Restivo",
    description: "Plateforme de gestion de restaurant avec Menu 3D immersif et Réalité Augmentée sur table.",
    start_url: "/start",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#FAF7F2",
    theme_color: "#B55234",
    categories: ["food", "productivity", "utilities"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/VisualIdentity/AppIcon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
