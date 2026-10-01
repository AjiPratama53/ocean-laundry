import {
  ApiError,
  cancelOrder,
  completeOrder,
  createOrder,
  deliverOrder,
  getOrderConditional,
  listOrdersConditional,
  newIdempotencyKey,
  pickupOrder,
  readyOrder,
  washOrder,
  weighOrder,
  type Order,
  type OrderStatus,
  type Problem,
} from "@/lib/api";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

/**
 * Orders store — cache over the api layer (A.2.3). ETag bookkeeping lives
 * in lib/api across polls (A.7.2); a 304 clears the stale marker (A.7.3).
 * Writes carry If-Match (A.8); a 412 is a normal condition surfaced to the
 * caller so the view can refresh + explain in domain terms.
 */
export const useOrderStore = defineStore("orders", function () {
  const orders = ref<Order[]>([]);
  const loaded = ref(false);
  const loading = ref(false);
  const lastError = ref<Problem | null>(null);
  const lastStatus = ref<number | null>(null);
  const fetchedAt = ref<Date | null>(null);
  const stale = ref(false);
  const staleNote = ref<string | null>(null);

  const getOrders = computed(() => orders.value);
  const getOrdersNumber = computed(() => orders.value.length);
  const isEmpty = computed(() => loaded.value && orders.value.length === 0);

  function setOrders(newOrders: Order[]) {
    orders.value = newOrders;
    loaded.value = true;
  }

  function getOrderById(id: string): Order | null {
    return orders.value.find((order) => order.id === id) ?? null;
  }

  function upsert(order: Order) {
    const i = orders.value.findIndex((o) => o.id === order.id);
    if (i >= 0) orders.value[i] = order;
    else orders.value = [order, ...orders.value];
    loaded.value = true;
  }

  async function fetchOrders(
    q: {
      status?: OrderStatus;
      limit?: number;
      cursor?: string;
    } = {},
  ): Promise<"fresh" | "not-modified"> {
    loading.value = true;
    try {
      const r = await listOrdersConditional(q);
      if (r.notModified) {
        stale.value = false;
        staleNote.value = null;
        fetchedAt.value = r.fetchedAt;
        return "not-modified";
      }
      orders.value = r.data ?? [];
      loaded.value = true;
      lastError.value = null;
      lastStatus.value = null;
      fetchedAt.value = r.fetchedAt;
      stale.value = false;
      staleNote.value = null;
      return "fresh";
    } catch (e) {
      if (e instanceof ApiError) {
        lastStatus.value = e.status;
        lastError.value = e.problem;
        if (loaded.value && orders.value.length > 0) {
          stale.value = true;
          staleNote.value = `last attempt failed ${e.status}.`;
        }
      }
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /** POST /orders with a stable Idempotency-Key per user intent (A.6.3). */
  async function placeOrder(
    input: { customerId: string; packageId: string; pickupAddress: string },
    idempotencyKey = newIdempotencyKey(),
  ): Promise<Order> {
    const r = await createOrder(input, idempotencyKey);
    upsert(r.data);
    return r.data;
  }

  /** GET /orders/{id} conditional — for detail views + 412 refresh. */
  async function fetchOrder(id: string, etag?: string | null) {
    return getOrderConditional(id, etag);
  }

  // Transitions — all conditional writes (If-Match via api layer).
  async function pickup(id: string, etag?: string | null) {
    const r = await pickupOrder(id, etag);
    upsert(r.data);
    return r;
  }
  async function weigh(id: string, weightGrams: number, etag?: string | null) {
    const r = await weighOrder(id, weightGrams, etag);
    upsert(r.data);
    return r;
  }
  async function wash(id: string, etag?: string | null) {
    const r = await washOrder(id, etag);
    upsert(r.data);
    return r;
  }
  async function ready(id: string, etag?: string | null) {
    const r = await readyOrder(id, etag);
    upsert(r.data);
    return r;
  }
  async function deliver(id: string, etag?: string | null) {
    const r = await deliverOrder(id, etag);
    upsert(r.data);
    return r;
  }
  async function complete(id: string, etag?: string | null) {
    const r = await completeOrder(id, etag);
    upsert(r.data);
    return r;
  }
  async function cancel(id: string, etag?: string | null) {
    const r = await cancelOrder(id, etag);
    upsert(r.data);
    return r;
  }

  return {
    orders,
    loaded,
    loading,
    lastError,
    lastStatus,
    fetchedAt,
    stale,
    staleNote,
    getOrders,
    getOrdersNumber,
    getOrderById,
    isEmpty,
    setOrders,
    upsert,
    fetchOrders,
    fetchOrder,
    placeOrder,
    pickup,
    weigh,
    wash,
    ready,
    deliver,
    complete,
    cancel,
  };
});
