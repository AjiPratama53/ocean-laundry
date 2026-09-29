<template>
  <v-alert class="mt-10" type="warning" variant="tonal">
    <div class="font-weight-bold">This account is not allowed to do that (403).</div>
    <div>Signing in again as the same person changes nothing — this screen needs a role your token does not hold.</div>
    <div v-if="$route.query.from" class="text-caption mt-1">Blocked route: <code>{{ $route.query.from }}</code></div>
    <v-btn class="mt-3" to="/" variant="outlined">Home</v-btn>
  </v-alert>
</template>
