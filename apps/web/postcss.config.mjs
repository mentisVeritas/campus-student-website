import path from "path";
import { fileURLToPath } from "url";

const appDir = path.dirname(fileURLToPath(import.meta.url));

const config = {
  plugins: {
    "@tailwindcss/postcss": {
      base: appDir,
    },
  },
};

export default config;
