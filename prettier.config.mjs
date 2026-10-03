/** @type {import("prettier").Config} */
const config = {
  printWidth: 100,
  // Sorts Tailwind classes in the official recommended order.
  plugins: ["prettier-plugin-tailwindcss"],
  tailwindStylesheet: "./src/app/globals.css",
  tailwindFunctions: ["cn", "cva"],
};

export default config;
