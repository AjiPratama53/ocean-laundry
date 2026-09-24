import ForbiddenView from "@/views/ForbiddenView.vue";
import Home from "@/views/Home.vue";
import Login from "@/views/Login.vue";
import NotFoundView from "@/views/NotFoundView.vue";
import OrderDetailView from "@/views/OrderDetailView.vue";
import OrderNewView from "@/views/OrderNewView.vue";
import OrdersView from "@/views/OrdersView.vue";
import PackagesView from "@/views/PackagesView.vue";
import PaymentDetailView from "@/views/PaymentDetailView.vue";
import PaymentNewView from "@/views/PaymentNewView.vue";
import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";

/**
 * One URL per workflow (A.2.1): detail lives at /orders/:id, never in a
 * selectedOrder variable — deep-linkable, bookmarkable, reload-safe.
 * Role meta is navigation UX only (A.2.2); access control is enforced by
 * the service and surfaced via 401/403/404 states (A.3/A.9).
 */
const routes: RouteRecordRaw[] = [
  { path: "/", name: "home", component: Home },
  {
    path: "/login",
    name: "login",
    component: Login,
  },
  {
    path: "/packages",
    name: "packages",
    component: PackagesView,
    // meta: { requiresAuth: true },
  },
  {
    path: "/orders",
    name: "orders",
    component: OrdersView,
    // meta: { requiresAuth: true },
  },
  {
    path: "/orders/new",
    name: "order-new",
    component: OrderNewView,
    // meta: { requiresAuth: true },
  },
  {
    path: "/orders/:id",
    name: "order-detail",
    component: OrderDetailView,
    // meta: { requiresAuth: true },
  },
  {
    path: "/payments/new",
    name: "payment-new",
    component: PaymentNewView,
    // meta: { requiresAuth: true },
  },
  {
    path: "/payments/:id",
    name: "payment-detail",
    component: PaymentDetailView,
    // meta: { requiresAuth: true },
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

// A.3.2 (401 row): unauthenticated visits to identity-needing screens go to
// sign-in with `redirect` remembered — never a blank screen or bare error.
router.beforeEach((to) => {
  if (!to.meta.requiresAuth) return true;
  try {
    if (!localStorage.getItem("ocean.session")) {
      return { path: "/login", query: { redirect: to.fullPath } };
    }
  } catch {
    return { path: "/login", query: { redirect: to.fullPath } };
  }
  return true;
});

export default router;
