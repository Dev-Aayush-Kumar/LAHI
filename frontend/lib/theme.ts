export const theme = {
  colors: {
    background: "#F8F6F2",
    surface: "#FFFFFF",

    primary: "#111111",
    secondary: "#6B7280",

    accent: "#C59D5F",

    border: "#E5E7EB",

    white: "#FFFFFF",
    black: "#000000",
  },

  typography: {
    heading: "Poppins",
    body: "Inter",
  },

  radius: {
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
  },

  spacing: {
    xs: "8px",
    sm: "16px",
    md: "24px",
    lg: "32px",
    xl: "48px",
    xxl: "64px",
  },

  shadow: {
    soft: "0 6px 20px rgba(0,0,0,0.06)",
  },

  transition: {
    default: "0.25s ease",
  },
} as const;