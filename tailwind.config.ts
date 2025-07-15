import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const textSizes = {
  "display-3xl": "--text-display-3xl",
  "display-2xl": "--text-display-2xl",
  "display-xl": "--text-display-xl",
  "display-lg": "--text-display-lg",
  "display-md": "--text-display-md",
  "display-sm": "--text-display-sm",
  "display-xs": "--text-display-xs",
  "text-xl": "--text-xl",
  "text-lg": "--text-lg",
  "text-md": "--text-md",
  "text-sm": "--text-sm",
  "text-xs": "--text-xs",
};

const fontWeights = {
  regular: "--font-weight-regular",
  medium: "--font-weight-medium",
  semibold: "--font-weight-semibold",
  bold: "--font-weight-bold",
  extrabold: "--font-weight-extrabold",
};

const customTextPlugin = plugin(({ addUtilities }) => {
  const newUtilities: Record<string, Record<string, string>> = {};

  for (const [sizeName, sizeVar] of Object.entries(textSizes)) {
    for (const [weightName, weightVar] of Object.entries(fontWeights)) {
      const className = `.${sizeName}-${weightName}`;
      newUtilities[className] = {
        fontSize: `var(${sizeVar})`,
        lineHeight: `var(${sizeVar}--line-height)`,
        letterSpacing: `var(${sizeVar}--letter-spacing)`,
        fontWeight: `var(${weightVar})`,
      };
    }
  }

  addUtilities(newUtilities);
});

export default {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Consolas",
          "Liberation Mono",
          "Menlo",
          "monospace",
        ],
      },
    },
  },
  plugins: [customTextPlugin],
} satisfies Config;
