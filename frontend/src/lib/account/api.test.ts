import { describe, expect, it, vi } from "vitest";

import { ApiError, createApi } from "@/lib/account/api";

function fakeFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: new Headers(headers),
  })) as unknown as typeof fetch;
}

function makeApi(fetchImpl: typeof fetch, token: string | null = null) {
  return createApi({ fetch: fetchImpl, baseUrl: "http://localhost", getToken: () => token });
}

describe("createApi ヘッダー", () => {
  it("X-Spra-App・Accept・Bearer・credentials omit を付ける", async () => {
    const fetchMock = fakeFetch(201, { token: "abc", user: { id: 1, name: "a", email: "a@b.c", email_verified: false } });
    const api = makeApi(fetchMock, "my-token");
    await api.getProgress(5);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = (fetchMock as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("http://localhost/api/tane/profiles/5/progress");
    const headers = init.headers as Headers;
    expect(headers.get("X-Spra-App")).toBe("tane");
    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer my-token");
    expect(init.credentials).toBe("omit");
  });

  it("トークンが無いときは Authorization を付けない", async () => {
    const fetchMock = fakeFetch(200, { open: true, invite_required: false });
    const api = makeApi(fetchMock, null);
    await api.registration();
    const [, init] = (fetchMock as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((init.headers as Headers).has("Authorization")).toBe(false);
  });
});

describe("createApi エラー", () => {
  it("401・403・429 は ApiError になる", async () => {
    for (const status of [401, 403, 429]) {
      const fetchMock = fakeFetch(status, { message: "だめだよ" });
      const api = makeApi(fetchMock);
      await expect(api.registration()).rejects.toMatchObject({ status, message: "だめだよ" });
    }
  });

  it("422 は message と errors をそのまま持つ", async () => {
    const fetchMock = fakeFetch(422, { message: "招待コードが違います", errors: { invite_code: ["招待コードが違います"] } });
    const api = makeApi(fetchMock);
    try {
      await api.register({ name: "a", email: "a@b.c", password: "pw123456", passwordConfirmation: "pw123456", terms: true }, "dev");
      expect.fail("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      const err = e as ApiError;
      expect(err.status).toBe(422);
      expect(err.message).toBe("招待コードが違います");
      expect(err.errors).toEqual({ invite_code: ["招待コードが違います"] });
    }
  });

  it("204（本文なし）は null を返す", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 204, json: async () => { throw new Error("no body"); }, headers: new Headers() })) as unknown as typeof fetch;
    const api = makeApi(fetchMock, "t");
    await expect(api.logout()).resolves.toBeNull();
  });
});

describe("createApi 呼び出しの形", () => {
  it("login は device_name を送り、user を emailVerified に変換する", async () => {
    const fetchMock = fakeFetch(201, { token: "abc", user: { id: 1, name: "たろう", email: "t@e.c", email_verified: true } });
    const api = makeApi(fetchMock);
    const result = await api.login("t@e.c", "password1", "iPhone");
    const [url, init] = (fetchMock as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("http://localhost/api/auth/token");
    expect(JSON.parse(init.body as string)).toEqual({ email: "t@e.c", password: "password1", device_name: "iPhone" });
    expect(result).toEqual({ token: "abc", user: { id: 1, name: "たろう", email: "t@e.c", emailVerified: true } });
  });

  it("putProgress は progress と playDays を送る", async () => {
    const fetchMock = fakeFetch(200, { progress: { stars: {} }, playDays: [] });
    const api = makeApi(fetchMock, "t");
    await api.putProgress(3, { progress: { stars: {} } as never, playDays: ["2026-10-21"] });
    const [url, init] = (fetchMock as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("http://localhost/api/tane/profiles/3/progress");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual({ progress: { stars: {} }, playDays: ["2026-10-21"] });
  });
});
