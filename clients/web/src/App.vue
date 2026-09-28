<template>
  <v-app>
    <!-- <staff-drawer /> -->
    <customer-drawer />
    <v-main class="bg-blue-50">
      <v-container class="py-8">
        <v-col class="flex flex-col gap-8">
          <!-- Customer -->
          <catalogue-view />
          <!-- <order-new-view /> -->
          <!-- <order-detail-view /> -->
          <!-- <payment /> -->

          <!-- Staff -->
          <!-- <packages-view /> -->

          <!-- <login /> -->
        </v-col>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { computed, onMounted, type Ref } from 'vue'
import { useSessionStore } from '@/stores/session'
import StaffDrawer from './components/staff/StaffDrawer.vue'
import CustomerDrawer from './components/customer/CustomerDrawer.vue'
import CatalogueView from './views/customer/CatalogueView.vue'
import PackagesView from './views/staff/PackagesView.vue'
import OrderNewView from './views/customer/OrderNewView.vue'
import OrderDetailView from './views/customer/OrderDetailView.vue'
import Payment from './views/customer/Payment.vue'
import type { ViewState } from './lib/viewState.ts'
import Login from './views/auth/Login.vue'

const session = useSessionStore()

onMounted(() => session.load())

const canOrder = computed(() => !session.isSignedIn || session.scopes.includes('orders:write'))
</script>
