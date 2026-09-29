<template>
  <v-app>
    <drawer username="Customer A" role="customer" />
    <v-main class="bg-blue-50">
      <!-- <v-banner class=" bg-red-100 text-red-700">
        <v-row class="flex justify-between items-center">
          <v-row class="flex items-center gap-2">
            <v-icon icon="mdi-wifi-off" size="x-large" />
            <v-col class="flex flex-col">
              <p><span class="bg-red-200 py-1 px-2 rounded-2xl">KONEKSI GATEWAY API TERPUTUS</span> • Terdeteksi pada
                14:42:10 WIB</p>
              <p>Sinkronisasi otomatis ke cabang dan telemetri mesin cuci sementara tidak aktif. Data lokal disimpan
                secara aman.</p>
            </v-col>
          </v-row>
          <v-row class="flex gap-2 justify-end items-center">
            <p class="bg-red-50 py-1 px-2 rounded-2xl">• Telemetry Disconnected</p>
            <v-btn icon="mdi-close" variant="text" />
          </v-row>
        </v-row>
      </v-banner> -->
      <v-container class="py-8">
        <v-col class="flex flex-col gap-8">
          <!-- Customer -->
          <!-- <catalogue-view /> -->
          <order-new-view />
          <!-- <order-detail-view /> -->
          <!-- <payment /> -->

          <!-- Staff -->
          <!-- <packages-view /> -->
          <!-- <orders-view /> -->

          <!-- <login /> -->
          <!-- <forbidden-view /> -->
          <!-- <not-found-view /> -->
        </v-col>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useSessionStore } from '@/stores/session'

import Drawer from './components/Drawer.vue'

// Customer views
import CatalogueView from './views/customer/CatalogueView.vue'
import OrderNewView from './views/customer/OrderNewView.vue'
import OrderDetailView from './views/customer/OrderDetailView.vue'
import Payment from './views/customer/Payment.vue'

// Staff views
import PackagesView from './views/staff/PackagesView.vue'
import OrdersView from './views/staff/OrdersView.vue'

import Login from './views/auth/Login.vue'
import ForbiddenView from './views/ForbiddenView.vue'
import NotFoundView from './views/NotFoundView.vue'

const session = useSessionStore()

onMounted(() => session.load())

</script>
