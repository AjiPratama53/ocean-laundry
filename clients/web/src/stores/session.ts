import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { clearSession, idpLogout, passwordGrant, readToken, registerUnauthorizedHandler, writeSession } from '@/lib/api'

function decodePayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split('.')
    if (!payload) return null
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>
  }
  catch {
    return null
  }
}

export const useSessionStore = defineStore('session', () => {
  const router = useRouter()
  const token = ref<string | null>(null)
  let handlerRegistered = false

  function load() {
    token.value = readToken()
    // A.3.1 — uniform 401 handling lives here + in the api layer, in one place.
    if (!handlerRegistered) {
      handlerRegistered = true
      registerUnauthorizedHandler((returnTo) => {
        token.value = null
        router.push({ path: '/signin', query: { redirect: returnTo || undefined } }).catch(() => {})
      })
    }
  }

  const isSignedIn = computed(() => !!token.value)
  const claims = computed(() => (token.value ? decodePayload(token.value) : null))
  const subject = computed(() => String(claims.value?.sub ?? ''))
  const scopes = computed(() => String(claims.value?.scope ?? '').split(' ').filter(Boolean))

  /** Role is UX only (A.2.2) — the service remains the sole enforcer. */
  const roles = computed(() => {
    const s = new Set(scopes.value)
    const r: string[] = []
    if (s.has('orders:write') || s.has('payments:write')) r.push('customer')
    if (s.has('deliveries:write')) r.push('courier')
    if (s.has('orders:fulfil') || s.has('packages:write')) r.push('staff')
    return r
  })
  const primaryRole = computed(() => roles.value[0] ?? (isSignedIn.value ? 'customer' : 'anonymous'))

  /** Expiry seen locally (the service verdict on 401 still wins). */
  const expiresAt = computed(() => {
    const exp = claims.value?.exp
    return typeof exp === 'number' ? new Date(exp * 1000) : null
  })

  function signInWithPassword(username: string, password: string, redirect?: string) {
    return passwordGrant(username.trim(), password).then((t) => {
      writeSession(t.access_token, t.refresh_token)
      token.value = t.access_token
      router.push(redirect || '/').catch(() => {})
    })
  }

  function signOut() {
    // The contract offers no sign-out operation (finding) — revoke the
    // refresh token at the IdP best-effort, then forget the local session
    // (which revokes nothing server-side on its own).
    const done = () => {
      clearSession()
      token.value = null
      router.push('/signin').catch(() => {})
    }
    idpLogout().then(done, done)
  }

  return { token, isSignedIn, claims, subject, scopes, roles, primaryRole, expiresAt, load, signInWithPassword, signOut }
})
