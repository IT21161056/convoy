export const colors = {
  // Surfaces
  background: "#10131A",
  panel: "#1A2029",
  raised: "#212836",
  divider: "#2B3242",

  // Accents
  primary: "#F5A623", // amber
  connected: "#3DDC97", // signal green
  alert: "#FF5A5F", // error red

  // Text
  text: "#EDEFF3",
  textMuted: "#8791A6",

  // Utility
  transparent: "transparent",
  overlay: "rgba(16, 19, 26, 0.6)",
} as const;

export type ColorKey = keyof typeof colors;
