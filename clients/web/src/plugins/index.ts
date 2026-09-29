/**
 * plugins/index.ts
 *
 * Automatically included in `./src/main.ts`
 */

// Types
import type { App } from "vue";

// Plugins
import vuetify from "./vuetify";

export function registerPlugins(app: App) {
  // Vuetify only. Pinia + router are installed once in main.ts —
  // installing a second Pinia here would fork the store registry.
  app.use(vuetify);
}
