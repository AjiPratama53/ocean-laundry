import ForbiddenView from "@/views/ForbiddenView.vue";
import Home from "@/views/Home.vue";
import Login from "@/views/auth/Login.vue";
import NotFoundView from "@/views/NotFoundView.vue";
import OrderDetailView from "@/views/customer/OrderDetailView.vue";
import OrderNewView from "@/views/customer/OrderNewView.vue";
import CatalogueView from "@/views/customer/CatalogueView.vue";
import PaymentView from "@/views/customer/Payment.vue";
import PaymentDetailView from "@/views/customer/PaymentDetailView.vue";
import OrdersView from "@/views/staff/OrdersView.vue";
import PackagesView from "@/views/staff/PackagesView.vue";
import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";

/**
 * One URL per workflow (A.2.1): detail lives at /orders/:id and
 * /customer/orders/:id, never in a selectedOrder variable — deep-linkable,
 * bookmarkable, reload-safe.
 *
 * Role separation (A.2.2 — navigation UX only, service enforces, see A.9):
 * - customer/* : catalogue → create order → pay → track own orders.
 * - staff/*     : manage packages, fulfil queues (weigh/wash/ready).
 * - courier/*   : pickup / delivery queues (deliveries:write).
 * Generic /packages, /orders, /orders/:id, /payments/* remain as
 * shareable deep-links and redirect into the role namespaces.
 *
 * Scope map (from openapi.yaml security scopes):
 * - customer: packages:read, orders:read, orders:write, payments:read/write
 * - courier:  orders:read, deliveries:write
 * - staff:    packages:read/write, orders:read, orders:fulfil
 *
 * requiredAnyScopes = "user needs at least one of these".
 * Missing scope -> /forbidden (403, domain terms — never back to sign-in,
 * otherwise a legitimate user loops sign-in→rejection→sign-in forever).
 * Missing identity -> /login?redirect=… (401, remembered return address).
 * Foreign objects -> service answers 404, shown as not-found (A.3).
 */

declare module "vue-router" {
  interface RouteMeta {
    requiresAuth?: boolean;
    requiredAnyScopes?: string[];
  }
}

const routes: RouteRecordRaw[] = [
  { path: "/", name: "home", component: Home },
  {
    path: "/login",
    name: "login",
    component: Login,
  },

  /* ---------------- Customer namespace (customer scope) ---------------- */
  {
    path: "/customer/catalogue",
    name: "customer-catalogue",
    component: CatalogueView,
    meta: { requiresAuth: true, requiredAnyScopes: ["packages:read"] },
  },
  {
    path: "/customer/orders",
    name: "customer-orders",
    component: OrdersView,
    meta: { requiresAuth: true, requiredAnyScopes: ["orders:read"] },
  },
  {
    path: "/customer/orders/new",
    name: "customer-order-new",
    component: OrderNewView,
    meta: { requiresAuth: true, requiredAnyScopes: ["orders:write"] },
  },
  {
    path: "/customer/orders/:id",
    name: "customer-order-detail",
    component: OrderDetailView,
    meta: { requiresAuth: true, requiredAnyScopes: ["orders:read"] },
  },
  {
    path: "/customer/payments/new",
    name: "customer-payment-new",
    component: PaymentView,
    meta: { requiresAuth: true, requiredAnyScopes: ["payments:write"] },
  },
  {
    path: "/customer/payments/:id",
    name: "customer-payment-detail",
    component: PaymentDetailView,
    meta: {
      requiresAuth: true,
      requiredAnyScopes: ["payments:read", "payments:write"],
    },
  },

  /* ---------------- Staff namespace (staff scope) ---------------- */
  {
    path: "/staff/packages",
    name: "staff-packages",
    component: PackagesView,
    meta: { requiresAuth: true, requiredAnyScopes: ["packages:read"] },
  },
  {
    path: "/staff/orders",
    name: "staff-orders",
    component: OrdersView,
    meta: { requiresAuth: true, requiredAnyScopes: ["orders:read"] },
  },
  // Staff work status through the queue dialog (OrdersView → Update),
  // never a detail page: OrderDetailView is customer-only (track/pay/cancel).
  {
    path: "/staff/orders/:id",
    redirect: "/staff/orders",
  },

  /* ---------------- Courier namespace (courier scope) ---------------- */
  {
    path: "/courier/pickups",
    name: "courier-pickups",
    component: OrdersView,
    meta: { requiresAuth: true, requiredAnyScopes: ["orders:read"] },
  },
  {
    path: "/courier/deliveries",
    name: "courier-deliveries",
    component: OrdersView,
    meta: { requiresAuth: true, requiredAnyScopes: ["orders:read"] },
  },

  /* ---------------- Generic deep-links (shareable, reload-safe) -------- */
  // Catalogue read is shared; write form inside is scope-gated UX only.
  {
    path: "/packages",
    name: "packages",
    component: CatalogueView,
    meta: { requiresAuth: true, requiredAnyScopes: ["packages:read"] },
  },
  // "Pesanan Saya" — service filters by ownership; foreign object -> 404.
  {
    path: "/orders",
    name: "orders",
    component: OrdersView,
    meta: { requiresAuth: true, requiredAnyScopes: ["orders:read"] },
  },
  {
    path: "/orders/new",
    redirect: "/customer/orders/new",
  },
  // Shared detail: action buttons inside are scope-gated UX only
  // (deliveries:write = pickup/delivery/complete, orders:fulfil =
  // weigh/wash/ready, orders:write = cancel, payments:write = pay).
  {
    path: "/orders/:id",
    name: "order-detail",
    component: OrderDetailView,
    meta: { requiresAuth: true, requiredAnyScopes: ["orders:read"] },
  },
  {
    path: "/payments/new",
    redirect: (to) => ({
      path: "/customer/payments/new",
      query: to.query,
    }),
  },
  {
    path: "/payments/:id",
    name: "payment-detail",
    component: PaymentDetailView,
    meta: {
      requiresAuth: true,
      requiredAnyScopes: ["payments:read", "payments:write"],
    },
  },
  {
    path: "/forbidden",
    name: "forbidden",
    component: ForbiddenView,
  },
  {
    path: "/not-found",
    name: "not-found",
    component: NotFoundView,
  },
  { path: "/:pathMatch(.*)*", redirect: "/not-found" },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

function readScopes(): string[] {
  try {
    const raw = localStorage.getItem("ocean.session");
    if (!raw) return [];
    const token = (JSON.parse(raw) as { token?: string }).token;
    if (!token) return [];
    const [, payload] = token.split(".");
    if (!payload) return [];
    const claims = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    ) as { scope?: string };
    return String(claims.scope ?? "")
      .split(" ")
      .filter(Boolean);
  } catch {
    return [];
  }
}

router.beforeEach((to) => {
  if (!to.meta.requiresAuth) {
    // Signed-in users hitting /login go home (keep their session).
    if (to.path === "/login") {
      try {
        if (localStorage.getItem("ocean.session")) return { path: "/" };
      } catch {
        /* storage unreadable -> show login */
      }
    }
    return true;
  }
  // A.3.2 (401 row): unauthenticated visits to identity-needing screens go
  // to sign-in with `redirect` remembered — never a blank screen.
  let signedIn = false;
  try {
    signedIn = !!localStorage.getItem("ocean.session");
  } catch {
    signedIn = false;
  }
  if (!signedIn) {
    return { path: "/login", query: { redirect: to.fullPath } };
  }
  // A.3.2 (403 row): identity known but scope insufficient -> explain in
  // domain terms on /forbidden. Never send back to sign-in: signing in
  // again as the same person changes nothing (avoids the 403-as-401 loop).
  const need = to.meta.requiredAnyScopes;
  if (need && need.length > 0) {
    const have = new Set(readScopes());
    if (!need.some((s) => have.has(s))) {
      return { path: "/forbidden", query: { from: to.fullPath } };
    }
  }
  return true;
});

export default router;
