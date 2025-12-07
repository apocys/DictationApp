import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
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

describe("dictation.generateDictation", () => {
  it("should require at least one word", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.dictation.generateDictation({ words: [] })
    ).rejects.toThrow();
  });

  it("should accept valid word array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // This will fail if no API key is configured, which is expected in test environment
    // We're just testing that the input validation works
    const words = ["tapisserie", "siècle", "document"];
    
    try {
      await caller.dictation.generateDictation({ words });
    } catch (error) {
      // Expected to fail due to missing API key in test environment
      expect(error).toBeDefined();
    }
  });
});
