import ForbiddenView from "@/views/ForbiddenView.vue";
import Home from "@/views/Home.vue";
import Login from "@/views/auth/Login.vue";
import NotFoundView from "@/views/NotFoundView.vue";
import OrderDetailView from "@/views/OrderDetailView.vue";
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
 * /payments/:id — deep-linkable, bookmarkable, reload-safe.
 *
 * Access is scope-gated UX only (A.2.2 — the service enforces, see A.9):
 * every route declares the scopes a token needs; buttons inside the
 * screens check the same scopes. No role concept lives in the client.
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

/**
 * Menu drawer (scope-filtered, UX only — the service enforces, see A.9).
 * Each item mirrors the guard of the route it points to (keep
 * `requiredAnyScopes` in sync with the route below): only pages the
 * token can actually open are shown, so a menu entry never leads to
 * /forbidden.
 */
export interface NavItem {
  title: string;
  icon: string;
  to: string;
  requiredAnyScopes: string[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Daftar Paket Laundry",
    icon: "mdi-archive-outline",
    to: "/packages",
    requiredAnyScopes: ["packages:write"],
  },
  {
    title: "Tracking & Riwayat",
    icon: "mdi-washing-machine",
    to: "/orders",
    // Staff queue: fulfil only. Customer/courier must not see this label
    // (they have their own entries below pointing elsewhere).
    requiredAnyScopes: ["orders:fulfil"],
  },
  {
    title: "Penjemputan",
    icon: "mdi-truck",
    to: "/pickups",
    // Courier-only queue. orders:read alone must NOT show this entry —
    // otherwise every customer/staff token would see a courier menu.
    requiredAnyScopes: ["deliveries:write"],
  },
  {
    title: "Pengantaran",
    icon: "mdi-package-variant-closed",
    to: "/deliveries",
    requiredAnyScopes: ["deliveries:write"],
  },
  {
    title: "Penyelesaian",
    icon: "mdi-check-circle-outline",
    to: "/completions",
    // Courier-only queue: orders being delivered, ready to complete.
    // Staff/customer tokens hold no deliveries:write, so this entry
    // (and its route below) never shows for them.
    requiredAnyScopes: ["deliveries:write"],
  },
  {
    title: "Katalog Laundry",
    icon: "mdi-archive-outline",
    to: "/catalogue",
    requiredAnyScopes: ["orders:write"],
  },
  {
    title: "Pesanan Saya",
    icon: "mdi-invoice-text-outline",
    to: "/orders",
    // Customer-only entry (UX role marker): every customer token holds
    // orders:write while staff/courier tokens do not. The /orders route
    // guard itself stays an OR over read/fulfil/deliveries (see below) —
    // this menu scope is intentionally narrower so staff/courier do not
    // see a "my orders" entry that is not theirs.
    requiredAnyScopes: ["orders:write"],
  },
  {
    title: "Buat Order",
    icon: "mdi-cart-plus",
    to: "/orders/new",
    requiredAnyScopes: ["orders:write"],
  },
];

const routes: RouteRecordRaw[] = [
  { path: "/", name: "home", component: Home },
  {
    path: "/login",
    name: "login",
    component: Login,
  },

  /* ---------------- Catalogue, order & payment (order/payment scopes) ---------------- */
  {
    path: "/catalogue",
    name: "catalogue",
    component: CatalogueView,
    // packages:read is held by several scope sets, so the guard uses
    // orders:write (the scope that may place orders from the catalogue).
    meta: { requiresAuth: true, requiredAnyScopes: ["orders:write"] },
  },
  {
    path: "/orders/new",
    name: "customer-order-new",
    component: OrderNewView,
    meta: { requiresAuth: true, requiredAnyScopes: ["orders:write"] },
  },
  {
    path: "/payments/new",
    name: "customer-payment-new",
    component: PaymentView,
    meta: { requiresAuth: true, requiredAnyScopes: ["payments:write"] },
  },
  {
    path: "/payments/:id",
    name: "customer-payment-detail",
    component: PaymentDetailView,
    meta: {
      requiresAuth: true,
      requiredAnyScopes: ["payments:read", "payments:write"],
    },
  },

  /* ---------------- Packages & order queue (package/fulfil scopes) ---------------- */
  // Package management needs packages:write. Tokens with only
  // packages:read are sent to /forbidden via the guard below.
  {
    path: "/packages",
    name: "packages",
    component: PackagesView,
    meta: {
      requiresAuth: true,
      requiredAnyScopes: ["packages:write"],
    },
  },
  // Shared order list: service filters by ownership for customers,
  // fulfilment filters via ?status=. Guard matches openapi GET /orders
  // (orders:read); orders:fulfil and deliveries:write are included so
  // tokens without a separate read scope land here instead of /forbidden.
  {
    path: "/orders",
    name: "staff-orders",
    component: OrdersView,
    meta: {
      requiresAuth: true,
      requiredAnyScopes: ["orders:read", "orders:fulfil", "deliveries:write"],
    },
  },

  /* ---------------- Pickup & delivery queues (delivery scopes) ---------------- */
  {
    path: "/pickups",
    name: "courier-pickups",
    component: OrdersView,
    meta: {
      requiresAuth: true,
      requiredAnyScopes: ["orders:read", "deliveries:write"],
    },
  },
  {
    path: "/deliveries",
    name: "courier-deliveries",
    component: OrdersView,
    meta: {
      requiresAuth: true,
      requiredAnyScopes: ["deliveries:write"],
    },
  },
  // Courier completion queue: delivering orders assigned to the courier,
  // each completable via the shared detail (deliveries:write = complete).
  {
    path: "/completions",
    name: "courier-completions",
    component: OrdersView,
    meta: {
      requiresAuth: true,
      requiredAnyScopes: ["deliveries:write"],
    },
  },

  // Shared detail: action buttons inside are scope-gated UX only
  // (deliveries:write = pickup/delivery/complete, orders:fulfil =
  // weigh/wash/ready, orders:write = cancel, payments:write = pay).
  // Guard mirrors GET /orders/{id} (orders:read) plus fulfil/write/
  // deliveries:write so scoped tokens land here instead of /forbidden —
  // the service still filters by ownership (foreign object -> 404).
  {
    path: "/orders/:id",
    name: "order-detail",
    component: OrderDetailView,
    meta: {
      requiresAuth: true,
      requiredAnyScopes: [
        "orders:read",
        "orders:write",
        "orders:fulfil",
        "deliveries:write",
      ],
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

/**
 * Role home derived from granted scopes (no role concept in the client —
 * the same scope markers the drawer uses): customer (orders:write) lands
 * on the catalogue, staff (orders:fulfil) on the order queue, courier
 * (deliveries:write) on pickups. Unknown scope sets fall back to the
 * dashboard, which gates every card by scope anyway.
 */
export function homeFor(scopes: string[]): string {
  const have = new Set(scopes);
  if (have.has("orders:write")) return "/catalogue";
  if (have.has("orders:fulfil")) return "/orders";
  if (have.has("deliveries:write")) return "/pickups";
  return "/";
}

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
  // Landing ('/') always redirects: guests to sign-in, signed-in users to
  // their role home (catalogue / order queue / pickups by granted scope).
  if (to.path === "/") {
    try {
      if (!localStorage.getItem("ocean.session")) return { path: "/login" };
    } catch {
      return { path: "/login" };
    }
    // homeFor falls back to "/" for marker-less tokens: stay instead of
    // redirecting to self (infinite loop) — the dashboard gates by scope.
    const home = homeFor(readScopes());
    if (home === "/") return true;
    return { path: home };
  }
  if (!to.meta.requiresAuth) {
    // Signed-in users hitting /login go to their role home (keep session).
    if (to.path === "/login") {
      try {
        if (localStorage.getItem("ocean.session"))
          return { path: homeFor(readScopes()) };
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
