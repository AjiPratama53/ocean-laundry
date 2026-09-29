<template>
    <v-card class="p-8 gap-4 flex flex-col items-center">
        <img src="@/assets/customer_error.svg" alt="Error">
        <h2 class="font-bold text-2xl">Gagal Memuat Halaman</h2>
        <p>
            Sepertinya ada gangguan koneksi. Coba muat ulang halaman ini, atau hubungi tim kami jika masalah berlanjut.
        </p>
        <v-btn class="bg-cyan-700 text-cyan-50" size="large" text="Coba lagi" />
        <a class="text-cyan-700" href="https://www.google.com">Hubungi Customer Service</a>
    </v-card>

</template>

<script setup lang="ts">
</script>

<style scoped></style>