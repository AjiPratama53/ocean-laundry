import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import {
  clearSession,
  idpLogout,
  passwordGrant,
  readToken,
  registerUnauthorizedHandler,
  writeSession,
} from "@/lib/api";

function decodePayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    return JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    ) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Session store: identity (username/subject) + granted scopes decoded
 * from the access token. There is no role concept here on purpose — all
 * access decisions in the client are scope checks (route guards, buttons,
 * menus), UX only; the service is the sole enforcer.
 */

export const useSessionStore = defineStore("session", () => {
  const router = useRouter();
  const token = ref<string | null>(null);
  let handlerRegistered = false;

  function load() {
    token.value = readToken();
    // A.3.1 — uniform 401 handling lives here + in the api layer, in one place.
    if (!handlerRegistered) {
      handlerRegistered = true;
      registerUnauthorizedHandler((returnTo) => {
        token.value = null;
        router
          .push({ path: "/login", query: { redirect: returnTo || undefined } })
          .catch(() => {});
      });
    }
  }

  const isSignedIn = computed(() => !!token.value);
  const claims = computed(() =>
    token.value ? decodePayload(token.value) : null,
  );
  const subject = computed(() => String(claims.value?.sub ?? ""));
  /** Display name from the IdP token (profile scope is a default client
   * scope, so preferred_username is always present). Falls back to sub. */
  const username = computed(
    () =>
      String(
        claims.value?.preferred_username ??
          claims.value?.name ??
          claims.value?.nickname ??
          claims.value?.sub ??
          "",
      ),
  );
  const scopes = computed(() =>
    String(claims.value?.scope ?? "")
      .split(" ")
      .filter(Boolean),
  );

  /** Expiry seen locally (the service verdict on 401 still wins). */
  const expiresAt = computed(() => {
    const exp = claims.value?.exp;
    return typeof exp === "number" ? new Date(exp * 1000) : null;
  });

  function loginWithPassword(
    username: string,
    password: string,
    redirect?: string,
  ) {
    return passwordGrant(username.trim(), password).then((t) => {
      writeSession(t.access_token, t.refresh_token);
      token.value = t.access_token;
      // An explicit ?redirect= from the guard wins; otherwise home,
      // which links every workflow the token can open.
      const dest = redirect && redirect !== "/" ? redirect : "/";
      router.push(dest).catch(() => {});
    });
  }

  function signOut() {
    // The contract offers no sign-out operation (finding) — revoke the
    // refresh token at the IdP best-effort, then forget the local session
    // (which revokes nothing server-side on its own).
    const done = () => {
      clearSession();
      token.value = null;
      router.push("/login").catch(() => {});
    };
    idpLogout().then(done, done);
  }

  return {
    token,
    isSignedIn,
    claims,
    subject,
    username,
    scopes,
    expiresAt,
    load,
    loginWithPassword,
    signOut,
  };
});
