<template>
  <v-app>
    <!-- <staff-drawer /> -->
    <customer-drawer />
    <v-main class="bg-blue-50">
      <v-container class="py-8">
        <v-col class="flex flex-col gap-8">
          <!-- <router-view /> -->
          <!-- <catalogue-view /> -->
          <!-- <order-new-view /> -->
          <order-detail-view />
          <!-- <packages-view /> -->
        </v-col>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useSessionStore } from '@/stores/session'
import StaffDrawer from './components/staff/StaffDrawer.vue'
import CustomerDrawer from './components/customer/CustomerDrawer.vue'
import CatalogueView from './views/customer/CatalogueView.vue'
import PackagesView from './views/staff/PackagesView.vue'
import OrderNewView from './views/customer/OrderNewView.vue'
import OrderDetailView from './views/customer/OrderDetailView.vue'

const session = useSessionStore()
onMounted(() => session.load())

const canOrder = computed(() => !session.isSignedIn || session.scopes.includes('orders:write'))
</script>
