import type { Order } from "@/lib/api";
import { defineStore } from "pinia";
import { computed, ref, type Ref } from "vue";

export const useOrderStore = defineStore("orders", function () {
  // States
  const orders = ref<Order[]>([
    {
      id: "ord_001",
      customerId: "cus_001",
      courierId: null,
      packageId: "pkg_001",
      pickupAddress: "Jl. Kaliurang No. 10",
      status: "picked_up",
      weightGrams: null,
      totalAmount: null,
      createdAt: "2026-09-29 02:14:17.100051+00",
      updatedAt: null,
    },
    {
      id: "ord_002",
      customerId: "cus_001",
      courierId: null,
      packageId: "pkg_001",
      pickupAddress: "Jl. Kaliurang No. 10",
      status: "awaiting_payment",
      weightGrams: null,
      totalAmount: null,
      createdAt: "2026-09-29 02:14:17.100051+00",
      updatedAt: null,
    },
    {
      id: "ord_003",
      customerId: "cus_001",
      courierId: null,
      packageId: "pkg_001",
      pickupAddress: "Jl. Kaliurang No. 10",
      status: "ready",
      weightGrams: null,
      totalAmount: null,
      createdAt: "2026-09-29 02:14:17.100051+00",
      updatedAt: null,
    },
  ]);

  // Getters
  const getOrders = computed(() => orders.value);
  const getOrdersNumber = computed(() => orders.value.length);
  const isEmpty = computed(() => orders.value.length === 0);

  // Setters
  function setOrders(newOrders: Order[]) {
    orders.value = newOrders;
  }

  function getOrderById(id: string): Order | null {
    return orders.value.find((order) => order.id === id) ?? null;
  }

  return {
    getOrders,
    getOrdersNumber,
    getOrderById,
    isEmpty,
    setOrders,
  };
});
