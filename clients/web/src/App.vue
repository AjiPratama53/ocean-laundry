<template>
  <v-app>
    <!-- <staff-drawer /> -->
    <customer-drawer />
    <v-main>
      <v-container>
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useSessionStore } from '@/stores/session'
import StaffDrawer from './components/staff/StaffDrawer.vue'
import CustomerDrawer from './components/customer/CustomerDrawer.vue'

const session = useSessionStore()
onMounted(() => session.load())

const canOrder = computed(() => !session.isSignedIn || session.scopes.includes('orders:write'))
</script>
