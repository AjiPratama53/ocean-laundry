import type { Order } from "@/lib/api";
import { defineStore } from "pinia";
import { computed, ref, type Ref } from "vue";

export const useOrderStore = defineStore("orders", function () {
  // States
  const orders = ref<Order[]>([]);

  // Getters
  const getOrders = computed(() => orders.value);
  const isEmpty = computed(() => orders.value.length === 0);

  // Setters
  function setOrders(newOrders: Order[]) {
    orders.value = newOrders;
  }

  return {
    getOrders,
    isEmpty,
    setOrders,
  };
});
