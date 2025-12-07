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
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("apiKeys router", () => {
  it("should save and retrieve API key", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Save API key
    const saveResult = await caller.apiKeys.save({
      geminiApiKey: "test-api-key-12345",
    });

    expect(saveResult).toEqual({ success: true });

    // Retrieve API key
    const getResult = await caller.apiKeys.get();

    expect(getResult).toBeDefined();
    expect(getResult?.geminiApiKey).toBe("test-api-key-12345");
    expect(getResult?.userId).toBe(1);
  });

  it("should update existing API key", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Save initial API key
    await caller.apiKeys.save({
      geminiApiKey: "initial-key",
    });

    // Update API key
    await caller.apiKeys.save({
      geminiApiKey: "updated-key",
    });

    // Retrieve updated API key
    const getResult = await caller.apiKeys.get();

    expect(getResult?.geminiApiKey).toBe("updated-key");
  });
});
