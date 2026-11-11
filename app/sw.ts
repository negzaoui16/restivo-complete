import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  NetworkFirst,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope;

const serwist = new Serwist({
  // ── Precache: app shell (JS/CSS chunks) + explicit entries from next.config ──
  precacheEntries: self.__SW_MANIFEST,

  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,

  // ── Offline fallback ─────────────────────────────────────────────────────────
  // When any navigation request fails (offline + never cached), show /offline
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.mode === "navigate",
      },
    ],
  },

  // ── Runtime caching ──────────────────────────────────────────────────────────
  runtimeCaching: [
    // 1. Pages: /homepage, /auth/*, /mainpage/*
    //    Strategy: StaleWhileRevalidate
    {
      matcher: ({ request, url }: { request: Request; url: URL }) =>
        request.mode === "navigate" &&
        (url.pathname === "/homepage" ||
          url.pathname.startsWith("/auth/") ||
          url.pathname.startsWith("/mainpage")),
      handler: new StaleWhileRevalidate({
        cacheName: "restivo-pages",
        plugins: [
          {
            cacheWillUpdate: async ({ response }) =>
              response.status === 0 || response.status === 200
                ? response
                : null,
          },
        ],
      }),
    },

    // 2. Images: /images/*, /VisualIdentity/*, /uploads/*
    //    Strategy: CacheFirst
    {
      matcher: ({ request, url }: { request: Request; url: URL }) =>
        request.destination === "image" ||
        url.pathname.startsWith("/images/") ||
        url.pathname.startsWith("/VisualIdentity/") ||
        url.pathname.startsWith("/uploads/"),
      handler: new CacheFirst({
        cacheName: "restivo-images",
        plugins: [
          {
            cacheWillUpdate: async ({ response }) =>
              response.status === 0 || response.status === 200
                ? response
                : null,
          },
        ],
      }),
    },

    // 2b. Modèles 3D (.glb) et /models/*
    //     Strategy: CacheFirst
    //     Crucial pour le Mode Hors-Ligne (AR & 3D). Servis depuis le cache local.
    {
      matcher: ({ url }: { url: URL }) =>
        url.pathname.endsWith(".glb") ||
        url.pathname.startsWith("/models/") ||
        (url.pathname.startsWith("/api/menu-items/") && url.pathname.endsWith("/3d")),
      handler: new CacheFirst({
        cacheName: "restivo-3d-models",
        plugins: [
          {
            cacheWillUpdate: async ({ response }) =>
              response.status === 0 || response.status === 200
                ? response
                : null,
          },
        ],
      }),
    },

    // 2c. Scripts tiers locaux (/vendor/* comme model-viewer.min.js)
    //     Strategy: CacheFirst
    {
      matcher: ({ url }: { url: URL }) => url.pathname.startsWith("/vendor/"),
      handler: new CacheFirst({
        cacheName: "restivo-vendor",
        plugins: [
          {
            cacheWillUpdate: async ({ response }) =>
              response.status === 0 || response.status === 200
                ? response
                : null,
          },
        ],
      }),
    },

    // 3. API calls: /api/* (future-proofing)
    //    Strategy: NetworkFirst
    //    → Always try the network first (data must be fresh).
    //      Fall back to cache when offline. 10-second timeout.
    {
      matcher: ({ url }: { url: URL }) => url.pathname.startsWith("/api/"),
      handler: new NetworkFirst({
        cacheName: "restivo-api",
        networkTimeoutSeconds: 10,
        plugins: [
          {
            cacheWillUpdate: async ({ response }) =>
              response.status === 0 || response.status === 200
                ? response
                : null,
          },
        ],
      }),
    },

    // 4. Everything else (fonts, other static assets)
    //    Fall through to Serwist's curated defaults.
    ...defaultCache,
  ],
});

serwist.addEventListeners();
