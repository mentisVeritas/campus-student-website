import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  globalIgnores([".next/**", "out/**", "build/**", "node_modules/**"]),
  {
    rules: {
      // Data-fetch on mount via useEffect + setState is used across dashboard pages.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);
