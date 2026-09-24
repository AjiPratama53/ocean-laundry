<template>
  <div class="py-6">
    <div class="d-flex align-center mb-4">
      <h1 class="text-h5 font-weight-bold">Katalog paket</h1>
      <v-spacer />
      <v-btn icon="mdi-refresh" variant="text" @click="refresh(true)" />
    </div>

    <ViewStateShell :state="shell" empty-text="Belum ada paket laundry — katalog masih kosong.">
      <v-row>
        <v-col v-for="p in packages" :key="p.id" cols="12" md="6">
          <v-card :title="p.name" :subtitle="`Rp ${p.price.toLocaleString('id-ID')}`" variant="outlined">
            <v-card-text>{{ p.description }}</v-card-text>
            <v-card-actions v-if="canWrite">
              <v-btn size="small" variant="text" @click="startEdit(p)">Ubah</v-btn>
              <v-btn size="small" color="error" variant="text" :loading="deleting === p.id"
                @click="remove(p)">Hapus</v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </ViewStateShell>

    <v-card v-if="canWrite" class="mt-6" :title="editing ? 'Ubah paket' : 'Tambah paket'" variant="outlined">
      <v-card-text>
        <v-text-field v-model="form.packageName" :error-messages="field('packageName')" label="Nama paket" />
        <v-text-field v-model="form.packageDesc" :error-messages="field('packageDesc')" label="Deskripsi" />
        <v-text-field v-model.number="form.packagePrice" :error-messages="field('packagePrice')" label="Harga (Rp)"
          type="number" />
        <v-alert v-if="formLevel" class="mt-2" type="error" variant="tonal" density="compact">{{ formLevel }}</v-alert>
        <v-alert v-if="conflict" class="mt-2" type="warning" variant="tonal" density="compact">
          Paket ini baru saja diubah orang lain — data terbaru sudah dimuat. Periksa lagi lalu simpan ulang.
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-btn v-if="editing" variant="text" @click="cancelEdit">Batal</v-btn>
        <v-spacer />
        <v-btn color="primary" :loading="saving" variant="flat" @click="save">{{ editing ? 'Simpan' : 'Tambah'
        }}</v-btn>
      </v-card-actions>
    </v-card>
    <v-alert v-else-if="forbiddenNote" class="mt-6" type="warning" variant="tonal">
      {{ forbiddenNote }}
    </v-alert>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ViewStateShell from '@/components/ViewStateShell.vue'
import {
  ApiError, createPackage, deletePackage, listPackagesConditional,
  updatePackage, type Package, type Problem,
} from '@/lib/api'
import type { ViewState } from '@/lib/viewState'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
const router = useRouter()
const canWrite = computed(() => session.scopes.includes('packages:write'))

const packages = ref<Package[]>([])
const fetchedAt = ref(new Date())
const stale = ref(false)
const staleNote = ref<string | null>(null)
const shell = ref<ViewState<unknown>>({ kind: 'loading' })
const forbiddenNote = ref<string | null>(null)

const pollMs = Number(import.meta.env.VITE_POLL_INTERVAL_MS ?? 10000)
let timer: number | undefined

function fieldErrorsOf(p: Problem | null): Record<string, string> {
  const out: Record<string, string> = {}
  for (const e of p?.['invalid-params'] ?? []) out[e.name] = e.reason
  return out
}

async function load(background: boolean) {
  try {
    // A.7 — If-None-Match carried from the module-level ETag cache; 304 = success.
    const r = await listPackagesConditional()
    if (!r.notModified) {
      packages.value = r.data
      fetchedAt.value = r.fetchedAt
    }
    stale.value = false
    staleNote.value = null
    shell.value = packages.value.length === 0
      ? { kind: 'empty' }
      : { kind: 'content', items: packages.value, fetchedAt: fetchedAt.value, stale: false, staleNote: null }
  }
  catch (e) {
    if (e instanceof ApiError && e.status === 401) return // api layer redirects
    if (e instanceof ApiError && e.status === 403) {
      // A.3.2 — domain terms, never "login again".
      shell.value = {
        kind: 'error',
        problem: { ...e.problem, detail: 'Akun ini tidak memiliki akses katalog (butuh izin packages:read).' },
        willRetry: false,
        retry: () => refresh(true),
      }
      return
    }
    if (background && packages.value.length > 0) {
      stale.value = true
      staleNote.value = 'percobaan terakhir gagal.'
      shell.value = { kind: 'content', items: packages.value, fetchedAt: fetchedAt.value, stale: true, staleNote: staleNote.value }
      return
    }
    shell.value = {
      kind: 'error',
      problem: e instanceof ApiError ? e.problem : { type: 'about:blank', title: 'Network', status: 0, detail: String(e), instance: '/packages' },
      willRetry: true,
      retry: () => refresh(true),
    }
  }
}

function refresh(manual: boolean) {
  if (manual && packages.value.length === 0) shell.value = { kind: 'loading' }
  void load(false)
}

onMounted(() => {
  void load(false)
  timer = window.setInterval(() => load(true), pollMs)
})
onUnmounted(() => window.clearInterval(timer))

/* ---- staff catalogue form (A.6) ---- */
const form = ref({ packageName: '', packageDesc: '', packagePrice: 0 })
const editing = ref<Package | null>(null)
const editingEtag = ref<string | null>(null)
const saving = ref(false)
const deleting = ref<string | null>(null)
const serverProblem = ref<Problem | null>(null)
const conflict = ref(false)
const formLevel = ref<string | null>(null)
const field = (n: string) => (fieldErrorsOf(serverProblem.value)[n] ? [fieldErrorsOf(serverProblem.value)[n]] : [])

function startEdit(p: Package) {
  editing.value = p
  conflict.value = false
  serverProblem.value = null
  form.value = { packageName: p.name, packageDesc: p.description, packagePrice: p.price }
}

function cancelEdit() {
  editing.value = null
  conflict.value = false
  serverProblem.value = null
  form.value = { packageName: '', packageDesc: '', packagePrice: 0 }
}

async function save() {
  serverProblem.value = null
  formLevel.value = null
  conflict.value = false
  // Client validation is UX only; the service enforces (A.6.2).
  if (!form.value.packageName.trim()) {
    serverProblem.value = { type: 'about:blank', title: 'Validation', status: 400, detail: '', instance: '', 'invalid-params': [{ name: 'packageName', reason: 'Nama paket wajib diisi.' }] }
    return
  }
  saving.value = true
  try {
    if (editing.value) {
      // A.8 — If-Match carries the version last seen; 412 is a normal condition.
      await updatePackage(editing.value.id, { ...form.value }, editingEtag.value)
    }
    else {
      await createPackage({ ...form.value })
    }
    cancelEdit()
    await load(false)
  }
  catch (e) {
    if (e instanceof ApiError && e.status === 412) {
      conflict.value = true
      await load(false)
    }
    else if (e instanceof ApiError && e.status === 403) {
      forbiddenNote.value = 'Akun ini tidak boleh mengubah katalog — hanya staff outlet.'
    }
    else if (e instanceof ApiError && (e.status === 400 || e.status === 422)) {
      serverProblem.value = e.problem.status === 422 && !e.problem['invalid-params']
        ? { ...e.problem, detail: e.problem.detail }
        : e.problem
      if (e.status === 422) formLevel.value = e.problem.detail
    }
    else if (e instanceof ApiError) {
      formLevel.value = e.problem.detail
    }
  }
  finally {
    saving.value = false
  }
}

async function remove(p: Package) {
  deleting.value = p.id
  try {
    await deletePackage(p.id)
    await load(false)
  }
  catch (e) {
    if (e instanceof ApiError && e.status === 412) {
      conflict.value = true
      await load(false)
    }
    else if (e instanceof ApiError && e.status === 403) {
      forbiddenNote.value = 'Akun ini tidak boleh menghapus paket.'
    }
    else if (e instanceof ApiError && e.status === 404) {
      await router.push('/not-found')
    }
  }
  finally {
    deleting.value = null
  }
}
</script>
