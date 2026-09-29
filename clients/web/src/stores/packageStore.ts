import {
  ApiError,
  createPackage,
  deletePackage,
  listPackagesConditional,
  updatePackage,
  type Package,
  type Problem,
} from "@/lib/api";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

/**
 * Packages store — thin cache over the api layer (A.2.3: components never
 * call fetch; they call domain functions via this store).
 * Conditional reads (A.7): ETag lives in the api module across polls;
 * a 304 keeps the current list and only clears the stale marker.
 */
export const usePackageStore = defineStore("packages", function () {
  const packages = ref<Package[]>([]);
  const loaded = ref(false);
  const loading = ref(false);
  const lastError = ref<Problem | null>(null);
  const lastStatus = ref<number | null>(null);
  const fetchedAt = ref<Date | null>(null);
  const stale = ref(false);
  const staleNote = ref<string | null>(null);

  const getPackages = computed(() => packages.value);
  const getPackagesNumber = computed(() => packages.value.length);
  const isEmpty = computed(() => loaded.value && packages.value.length === 0);

  function setPackages(newPackages: Package[]) {
    packages.value = newPackages;
    loaded.value = true;
  }

  function getPackageById(id: string) {
    return packages.value.find((pkg) => pkg.id === id);
  }

  /** Polled list fetch. Returns 'not-modified' when the service says 304. */
  async function fetchPackages(): Promise<"fresh" | "not-modified"> {
    loading.value = true;
    try {
      const r = await listPackagesConditional();
      if (r.notModified) {
        // A.7.3: 304 is success — clear stale, keep data.
        stale.value = false;
        staleNote.value = null;
        fetchedAt.value = r.fetchedAt;
        return "not-modified";
      }
      packages.value = r.data ?? [];
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
        // Content already held -> mark stale instead of wiping (A.5).
        if (loaded.value && packages.value.length > 0) {
          stale.value = true;
          staleNote.value = `last attempt failed ${e.status}.`;
        }
      }
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /** POST /packages (staff, packages:write). 400/422 invalid-params bubble. */
  async function addPackage(input: {
    packageName: string;
    packageDesc: string;
    packagePrice: number;
  }): Promise<Package> {
    const r = await createPackage(input);
    packages.value = [...packages.value, r.data];
    loaded.value = true;
    return r.data;
  }

  /**
   * PATCH /packages/{id} with If-Match (A.8). Caller holds the etag from
   * the last read; a 412 means somebody else wrote first.
   */
  async function editPackage(
    id: string,
    input: { packageName?: string; packageDesc?: string; packagePrice?: number },
    etag?: string | null,
  ): Promise<Package> {
    const r = await updatePackage(id, input, etag);
    packages.value = packages.value.map((p) => (p.id === id ? r.data : p));
    return r.data;
  }

  async function removePackage(id: string, etag?: string | null) {
    await deletePackage(id, etag);
    packages.value = packages.value.filter((p) => p.id !== id);
  }

  return {
    packages,
    loaded,
    loading,
    lastError,
    lastStatus,
    fetchedAt,
    stale,
    staleNote,
    getPackages,
    getPackagesNumber,
    isEmpty,
    getPackageById,
    setPackages,
    fetchPackages,
    addPackage,
    editPackage,
    removePackage,
  };
});
