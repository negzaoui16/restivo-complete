export interface MenuTheme {
  id: string;
  name: string;
  primaryColor: string;
  hoverColor: string;
  lightColor: string;
  accentText: string;
}

export const MENU_THEMES: MenuTheme[] = [
  {
    id: "terracotta",
    name: "Terracotta Restivo",
    primaryColor: "#B55234",
    hoverColor: "#9E4328",
    lightColor: "#FAF0EA",
    accentText: "#B55234",
  },
  {
    id: "crimson",
    name: "Rouge Italien (Trattoria)",
    primaryColor: "#8B0000",
    hoverColor: "#700000",
    lightColor: "#FFF0F0",
    accentText: "#8B0000",
  },
  {
    id: "emerald",
    name: "Vert Bio & Fresh",
    primaryColor: "#1B4332",
    hoverColor: "#143326",
    lightColor: "#E8F5E9",
    accentText: "#1B4332",
  },
  {
    id: "gold",
    name: "Noir & Or Gastronomique",
    primaryColor: "#1A1A1A",
    hoverColor: "#0A0A0A",
    lightColor: "#FAF7EE",
    accentText: "#B38C26",
  },
  {
    id: "ocean",
    name: "Bleu Méditerranée",
    primaryColor: "#1E3A8A",
    hoverColor: "#172E6E",
    lightColor: "#EFF6FF",
    accentText: "#1E3A8A",
  },
];

export interface MenuCustomization {
  themeId: string;
  viewMode: "grid" | "list";
  bannerUrl?: string;
}

const CONFIG_REGEX = /<!--\s*RESTIVO_MENU_CONFIG:\s*(\{.*?\})\s*-->/i;

export function parseMenuCustomization(rawDescription: string | null | undefined): {
  description: string;
  theme: MenuTheme;
  viewMode: "grid" | "list";
  bannerUrl?: string;
} {
  const defaultTheme = MENU_THEMES[0];
  if (!rawDescription) {
    return {
      description: "",
      theme: defaultTheme,
      viewMode: "grid",
    };
  }

  const match = rawDescription.match(CONFIG_REGEX);
  if (match) {
    const description = rawDescription.replace(match[0], "").trim();
    try {
      const parsed: Partial<MenuCustomization> = JSON.parse(match[1]);
      const matchedTheme = MENU_THEMES.find((t) => t.id === parsed.themeId) ?? defaultTheme;
      return {
        description,
        theme: matchedTheme,
        viewMode: parsed.viewMode === "list" ? "list" : "grid",
        bannerUrl: parsed.bannerUrl,
      };
    } catch {
      // Ignore parsing errors
    }
    return {
      description,
      theme: defaultTheme,
      viewMode: "grid",
    };
  }

  return {
    description: rawDescription.trim(),
    theme: defaultTheme,
    viewMode: "grid",
  };
}

export function formatMenuCustomization(
  description: string,
  config: { themeId: string; viewMode: "grid" | "list"; bannerUrl?: string }
): string {
  const clean = description.replace(CONFIG_REGEX, "").trim();
  const configString = `<!-- RESTIVO_MENU_CONFIG:${JSON.stringify(config)} -->`;
  return clean ? `${clean}\n${configString}` : configString;
}
