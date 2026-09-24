import type { Package } from "@/lib/api";
import { defineStore } from "pinia";
import { computed, ref, type Ref } from "vue";

export const usePackageStore = defineStore("packages", function () {
  // States
  const packages = ref<Package[]>([]);

  // Getters
  const getPackages = computed(() => packages.value);
  const isEmpty = computed(() => packages.value.length === 0);

  // Setters
  function setPackages(newPackages: Package[]) {
    packages.value = newPackages;
  }

  return {
    getPackages,
    isEmpty,
    setPackages,
  };
});
