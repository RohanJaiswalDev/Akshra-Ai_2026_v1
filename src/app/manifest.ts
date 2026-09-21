import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Akshra Ai",
    short_name: "Akshra",
    description: "Akshra Ai - Next-generation AI Assistant",
    start_url: "/",
    display: "standalone",
    background_color: "#171717",
    theme_color: "#171717",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "New Chat",
        short_name: "New Chat",
        description: "Start a new conversation with Akshra Ai",
        url: "/?action=new",
        icons: [
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
          },
        ],
      },
    ],
    categories: ["productivity", "utilities", "education"],
  };
}
