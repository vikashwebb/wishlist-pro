import { beforeEach, describe, expect, it, vi } from "vitest";

const executeRawUnsafe = vi.fn();
const sessionCount = vi.fn();
const mockClient = {
  $executeRawUnsafe: (...args) => executeRawUnsafe(...args),
  session: {
    count: (...args) => sessionCount(...args),
  },
};

vi.mock("../app/db.server.js", () => ({
  syncPrismaClientForServerless: () => mockClient,
  getPrismaClient: () => mockClient,
}));

import { ensureSqliteSchema } from "../app/ensure-sqlite-schema.server.js";

describe("ensureSqliteSchema", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionCount.mockResolvedValue(0);
  });

  it("creates tables with raw SQL", async () => {
    await ensureSqliteSchema();

    expect(executeRawUnsafe).toHaveBeenCalled();
    expect(executeRawUnsafe.mock.calls.some(([sql]) => sql.includes("Session"))).toBe(
      true,
    );
    expect(sessionCount).toHaveBeenCalled();
  });
});
