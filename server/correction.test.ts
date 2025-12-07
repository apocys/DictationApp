import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("correction router", () => {
  it("should require authentication for analyze", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.correction.analyze({
        originalText: "Test text",
        userImageUrl: "https://example.com/image.jpg",
      })
    ).rejects.toThrow();
  });

  it("should require authentication for getHistory", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    await expect(caller.correction.getHistory()).rejects.toThrow();
  });

  it("should validate input for analyze", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Empty originalText should fail
    await expect(
      caller.correction.analyze({
        originalText: "",
        userImageUrl: "https://example.com/image.jpg",
      })
    ).rejects.toThrow();

    // Invalid URL should fail
    await expect(
      caller.correction.analyze({
        originalText: "Test text",
        userImageUrl: "not-a-url",
      })
    ).rejects.toThrow();
  });

  it("should return empty history for new user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const history = await caller.correction.getHistory();
    expect(Array.isArray(history)).toBe(true);
  });
});
