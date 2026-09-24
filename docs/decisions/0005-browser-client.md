# 0005: Browser Client

Framework: Vue JS + Tailwindcss

Work flows:

| Workflow | Screen | Role Permitted | Operation in openapi.yaml |
|---|---|---|---|
| Staff creates new packages | Packages list | staff | GET /packages |
| | Adds package description | staff | POST /packages |
| | Packages list | staff | GET /packages |
| Staff updates a package | Packages list | staff | GET /packages |
| | Edits package details | staff | PUT /packages/{id} |
| | Packages list | staff | GET /packages |
| Customer creates an order | Packages list | customer | GET /packages |
| | Package details | customer | GET /packages/{id} |
| | Create order form | customer | POST /orders |
| Courier delivers the order to staff | Orders list | courier | GET /orders |
| | Order details | courier | PUT /orders/{id}/pickup |
| Staff processes the order | Order details | staff | PUT /orders/{id}/weigh |
| | Order details | staff | PUT /orders/{id}/start-wash |
| | Order details | staff | PUT /orders/{id}/ready |
| Staff process the payment for an order | Orders list | staff | GET /orders/{id} |
| | Payment form | staff | POST /payments |
| | Payment details | staff | PUT /payments/{id}/status |
| Courier delivers the order to customer | Order details | courier | PUT /orders/{id}/start-delivery |
| | Order details | courier | PUT /orders/{id}/complete-delivery |


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
