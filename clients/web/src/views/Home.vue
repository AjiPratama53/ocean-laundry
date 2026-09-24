<template>
  <div class="py-8">
    <h1 class="text-h4 font-weight-bold mb-2">Laundry antar-jemput, end to end.</h1>
    <p class="text-body-1 text-medium-emphasis mb-6">
      Customer memesan, kurir menjemput &amp; mengantar, staff menimbang &amp; mencuci —
      semua dari kontrak <code>openapi.yaml</code> yang sama.
    </p>

    <v-alert v-if="!session.isSignedIn" type="info" variant="tonal" class="mb-6">
      Login with your access token to start a workflow. Protected pages send you
      to sign-in automatically — never a blank screen.
      <v-btn class="ml-3" color="primary" to="/login" variant="flat" size="small">Login</v-btn>
    </v-alert>

    <div class="grid md:grid-cols-2 gap-4">
      <v-card title="Customer — pesan & bayar" subtitle="Katalog → buat order → bayar → lacak" variant="outlined">
        <v-card-text>GET /packages · POST /orders · GET /orders · POST /payments</v-card-text>
        <v-card-actions>
          <v-btn to="/packages" variant="outlined">Katalog</v-btn>
          <v-btn to="/orders/new" color="primary" variant="flat">Buat order</v-btn>
        </v-card-actions>
      </v-card>
      <v-card title="Kurir — jemput & antar" subtitle="Daftar order → pickup → delivery → complete" variant="outlined">
        <v-card-text>GET /orders · GET /orders/{id} · POST …/pickup · …/delivery · …/complete</v-card-text>
        <v-card-actions><v-btn to="/orders" variant="outlined">Order saya</v-btn></v-card-actions>
      </v-card>
      <v-card title="Staff — timbang → siap" subtitle="Weigh → wash → ready" variant="outlined">
        <v-card-text>GET /orders?status=… · POST …/weigh · …/wash · …/ready</v-card-text>
        <v-card-actions><v-btn to="/orders?status=picked_up" variant="outlined">Perlu ditimbang</v-btn></v-card-actions>
      </v-card>
      <v-card title="Staff — kelola katalog" subtitle="Tambah / ubah / hapus paket" variant="outlined">
        <v-card-text>GET /packages · POST · PATCH /packages/{id} · DELETE /packages/{id}</v-card-text>
        <v-card-actions><v-btn to="/packages" variant="outlined">Kelola</v-btn></v-card-actions>
      </v-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSessionStore } from '@/stores/session'
const session = useSessionStore()
</script>
