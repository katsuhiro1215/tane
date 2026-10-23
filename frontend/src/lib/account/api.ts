import type { SyncedProgress } from "@/lib/sync/progress-merge";

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  code?: string;

  constructor(status: number, message: string, errors?: Record<string, string[]>, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.code = code;
  }
}

export interface AuthUserPayload {
  id: number;
  name: string;
  email: string;
  emailVerified: boolean;
  /** 同意が古い（新しい版の利用規約・プライバシーポリシーへ同意しなおしていない） */
  termsOutdated: boolean;
}

export interface CurrentUser extends AuthUserPayload {
  /** 現在の版（POST /api/terms/accept に送る値） */
  termsVersionCurrent: string;
}

export interface LoginResult {
  token: string;
  user: AuthUserPayload;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  terms: boolean;
  inviteCode?: string;
}

export interface Registration {
  open: boolean;
  inviteRequired: boolean;
}

export interface Profile {
  id: number;
  name: string;
  avatar: string | null;
}

export interface ProgressResponse {
  progress: SyncedProgress;
  playDays: string[];
}

export interface ParentRecords {
  profiles: (Profile & ProgressResponse)[];
}

export interface ApiDeps {
  fetch: typeof fetch;
  baseUrl: string;
  getToken: () => string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstErrorMessage(errors: Record<string, string[]>): string | null {
  const first = Object.values(errors)[0];
  return Array.isArray(first) && typeof first[0] === "string" ? first[0] : null;
}

const STATUS_FALLBACK: Record<number, string> = {
  401: "ログインが きれました",
  403: "つかえません",
  429: "すこし まってから、もういちど ためしてね",
};

function mapUser(data: unknown): AuthUserPayload {
  if (!isRecord(data)) throw new Error("invalid user payload");
  return {
    id: data.id as number,
    name: data.name as string,
    email: data.email as string,
    emailVerified: data.email_verified === true,
    termsOutdated: data.terms_outdated === true,
  };
}

export function deviceName(): string {
  if (typeof navigator === "undefined" || !navigator.userAgent) return "tane";
  return navigator.userAgent.slice(0, 100);
}

export function createApi(deps: ApiDeps) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("X-Spra-App", "tane");
    headers.set("Accept", "application/json");
    if (init.body) headers.set("Content-Type", "application/json");
    const token = deps.getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const res = await deps.fetch(`${deps.baseUrl}${path}`, { ...init, headers, credentials: "omit" });
    if (res.status === 204) return null as T;

    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      const errors = isRecord(data) && isRecord(data.errors) ? (data.errors as Record<string, string[]>) : undefined;
      const serverMessage = isRecord(data) && typeof data.message === "string" ? data.message : null;
      const code = isRecord(data) && typeof data.code === "string" ? data.code : undefined;
      const message =
        (errors && firstErrorMessage(errors)) ??
        serverMessage ??
        STATUS_FALLBACK[res.status] ??
        "つうしんに しっぱいしました";
      throw new ApiError(res.status, message, errors, code);
    }
    return data as T;
  }

  return {
    async login(email: string, password: string, device: string): Promise<LoginResult> {
      const data = await request<{ token: string; user: unknown }>("/api/auth/token", {
        method: "POST",
        body: JSON.stringify({ email, password, device_name: device }),
      });
      return { token: data.token, user: mapUser(data.user) };
    },

    async register(form: RegisterForm, device: string): Promise<LoginResult> {
      const data = await request<{ token: string; user: unknown }>("/api/auth/register-token", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          password_confirmation: form.passwordConfirmation,
          terms: form.terms,
          device_name: device,
          ...(form.inviteCode ? { invite_code: form.inviteCode } : {}),
        }),
      });
      return { token: data.token, user: mapUser(data.user) };
    },

    async logout(): Promise<null> {
      return request<null>("/api/auth/token", { method: "DELETE" });
    },

    async getUser(): Promise<CurrentUser> {
      const data = await request<unknown>("/api/user");
      const user = mapUser(data);
      const termsVersionCurrent = isRecord(data) && typeof data.terms_version_current === "string" ? data.terms_version_current : "";
      return { ...user, termsVersionCurrent };
    },

    async acceptTerms(version: string): Promise<null> {
      return request<null>("/api/terms/accept", { method: "POST", body: JSON.stringify({ version }) });
    },

    async registration(): Promise<Registration> {
      const data = await request<{ open: boolean; invite_required: boolean }>("/api/registration");
      return { open: data.open, inviteRequired: data.invite_required };
    },

    async profiles(): Promise<Profile[]> {
      return request<Profile[]>("/api/profiles");
    },

    async createProfile(name: string): Promise<Profile> {
      return request<Profile>("/api/profiles", { method: "POST", body: JSON.stringify({ name }) });
    },

    async getProgress(profileId: number): Promise<ProgressResponse> {
      return request<ProgressResponse>(`/api/tane/profiles/${profileId}/progress`);
    },

    async putProgress(profileId: number, payload: ProgressResponse): Promise<ProgressResponse> {
      return request<ProgressResponse>(`/api/tane/profiles/${profileId}/progress`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },

    async confirmPassword(password: string): Promise<null> {
      return request<null>("/api/auth/confirm-password", { method: "POST", body: JSON.stringify({ password }) });
    },

    async parentRecords(): Promise<ParentRecords> {
      return request<ParentRecords>("/api/tane/parent/records");
    },
  };
}

export type Api = ReturnType<typeof createApi>;
