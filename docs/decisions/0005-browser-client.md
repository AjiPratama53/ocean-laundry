# 0005: Browser Client

Framework: Vue JS + Tailwindcss

Structure:

```
clients/web/
├── public/                 # Static assets not processed by Vite (favicon.ico, robots.txt)
├── src/
│   ├── assets/             # Compiled assets (CSS/SCSS, global fonts, SVG icons)
│   ├── components/         # Reusable, non-routed UI components (Button.vue, Modal.vue)
│   ├── composables/        # Vue 3 Composition API logic (useAuth.ts, useFetch.ts)
│   ├── router/             # Vue Router configuration (index.ts, routes.ts)
│   ├── stores/             # Global state management using Pinia (userStore.ts)
│   ├── views/              # Route-level components (HomeView.vue, LoginView.vue)
│   ├── services/           # API fetch calls (axios instances, endpoints)
│   ├── utils/              # Pure helper functions (dateFormatter.ts, validation.ts)
│   ├── App.vue             # Root component that hosts <router-view>
│   └── main.ts             # Entry point (mounts app, registers plugins)
├── .env                    # Environment variables (VITE_API_URL)
├── package.json            # Dependencies
└── vite.config.ts          # Vite build configuration
```
