<template>
    <v-card class="mx-auto mt-10" max-width="480" title="Login">
        <v-card-text>
            <v-text-field v-model="username" autocomplete="username" :error-messages="usernameErrors"
                label="Nama pengguna" @update:model-value="clearServerError" />
            <v-text-field v-model="password" :append-inner-icon="show ? 'mdi-eye-off' : 'mdi-eye-open'"
                autocomplete="current-password" :error-messages="passwordErrors" label="Kata sandi"
                :type="show ? 'text' : 'password'" @click:append-inner="show = !show"
                @update:model-value="clearServerError" @keyup.enter="submit" />
            <!-- Form-level refusal: wrong credentials / unreachable IdP. -->
            <v-alert v-if="formError" class="mt-2" type="error" variant="tonal" density="compact">
                {{ formError }}
            </v-alert>
        </v-card-text>
        <v-card-actions>
            <v-spacer />
            <!-- Disabled while in flight (A.6.3). -->
            <v-btn color="primary" :disabled="busy" :loading="busy" variant="flat" @click="submit">Login</v-btn>
        </v-card-actions>
    </v-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { AuthError } from '@/lib/api'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
const route = useRoute()

const username = ref('')
const password = ref('')
const show = ref(false)
const busy = ref(false)
const usernameErrors = ref<string[]>([])
const passwordErrors = ref<string[]>([])
const formError = ref<string | null>(null)

function clearServerError() {
    formError.value = null
}

async function submit() {
    usernameErrors.value = []
    passwordErrors.value = []
    formError.value = null
    // Client validation is UX only; the server enforces (A.6.2).
    if (!username.value.trim()) usernameErrors.value = ['Nama pengguna wajib diisi.']
    if (!password.value) passwordErrors.value = ['Kata sandi wajib diisi.']
    if (usernameErrors.value.length || passwordErrors.value.length) return

    busy.value = true
    try {
        await session.loginWithPassword(username.value, password.value, String(route.query.redirect ?? '/'))
    }
    catch (e) {
        if (e instanceof AuthError && e.code === 'invalid_grant') {
            // A.6.4 — domain terms on the form, not a status code.
            formError.value = 'Nama pengguna atau kata sandi salah. Periksa lagi lalu coba masuk.'
        }
        else if (e instanceof AuthError) {
            formError.value = `Tidak dapat menghubungi layanan masuk: ${e.message}`
        }
        else {
            formError.value = 'Sign-in gagal. Coba lagi.'
        }
    }
    finally {
        busy.value = false
    }
}
</script>
