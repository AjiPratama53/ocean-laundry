<template>
  <v-app>
    <drawer v-if="showDrawer" />
    <v-main class="bg-blue-50">
      <v-container class="py-8">
        <!-- Every workflow has its own URL (A.2.1): all UI renders through
             the router so screens are linkable, bookmarkable, reload-safe. -->
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSessionStore } from '@/stores/session'

import Drawer from './components/Drawer.vue'

const session = useSessionStore()
const route = useRoute()

const showDrawer = computed(() => route.path !== '/login')

onMounted(() => session.load())

</script>
