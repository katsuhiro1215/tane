import { createLocalStore } from "@/lib/local-store";

export const AUTH_KEY = "tane:auth:v1";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  emailVerified: boolean;
}

export type AuthState = {
  token: string;
  user: AuthUser;
  profileId: number | null;
} | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseUser(value: unknown): AuthUser | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "number" || typeof value.name !== "string" || typeof value.email !== "string") return null;
  if (typeof value.emailVerified !== "boolean") return null;
  return { id: value.id, name: value.name, email: value.email, emailVerified: value.emailVerified };
}

export function parseAuth(raw: string | null): AuthState {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(data)) return null;
  if (typeof data.token !== "string" || data.token === "") return null;
  const user = parseUser(data.user);
  if (!user) return null;
  if (data.profileId !== null && typeof data.profileId !== "number") return null;
  return { token: data.token, user, profileId: data.profileId === null ? null : data.profileId };
}

const store = createLocalStore<AuthState>(AUTH_KEY, parseAuth, null);

export const readAuth = store.read;
export const useAuth = store.useValue;

export function saveAuth(state: AuthState): void {
  store.write(state);
}

export function clearAuth(): void {
  store.remove();
}
