import { expect, test } from "vitest";
import schema from "../convex/schema";

test("every serialized Convex table has unique deployment index names", () => {
  const deployment = JSON.parse(
    (schema as unknown as { export(): string }).export(),
  ) as {
    tables: Array<{
      tableName: string;
      indexes: Array<{ indexDescriptor: string }>;
      searchIndexes: Array<{ indexDescriptor: string }>;
      vectorIndexes: Array<{ indexDescriptor: string }>;
    }>;
  };
  for (const table of deployment.tables) {
    const names = [
      ...table.indexes,
      ...table.searchIndexes,
      ...table.vectorIndexes,
    ].map((i) => i.indexDescriptor);
    expect(new Set(names).size, table.tableName).toBe(names.length);
  }
});
