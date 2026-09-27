import type { Package } from "@/lib/api";
import { defineStore } from "pinia";
import { computed, ref, type Ref } from "vue";

export const usePackageStore = defineStore("packages", function () {
  // States
  const packages = ref<Package[]>([
    {
      id: "pkg_002",
      name: "Express Wash",
      description: "Cuci lipat 1 hari",
      price: 6000,
    },
    {
      id: "pkg_f717daab-e4a0-4c24-bc2e-930a451d0299",
      name: "Uji Coba",
      description: "blablabla",
      price: 10000,
    },
    {
      id: "pkg_001",
      name: "Regular Wash",
      description: "Cuci lipat 2 hari",
      price: 6000,
    },
  ]);

  // Getters
  const getPackages = computed(() => packages.value);
  const getPackagesNumber = computed(() => packages.value.length);
  const isEmpty = computed(() => packages.value.length === 0);

  // Setters
  function setPackages(newPackages: Package[]) {
    packages.value = newPackages;
  }

  return {
    getPackages,
    getPackagesNumber,
    isEmpty,
    setPackages,
  };
});
