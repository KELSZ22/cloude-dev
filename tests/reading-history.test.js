import { describe, expect, test } from "bun:test";

import { READING_HISTORY_LIMIT, recentViews } from "../src/shared/stores/reading-history-store";

const viewedAt = "2026-10-10T00:00:00.000Z";

describe("recent reading history", () => {
  test("keeps the newest six and drops the oldest", () => {
    let items = [];
    for (let index = 1; index <= READING_HISTORY_LIMIT; index += 1) {
      items = recentViews(items, { id: `wikipedia-en-${index}`, title: `Article ${index}`, source: "Wikipedia" }, viewedAt);
    }
    expect(items.map((item) => item.id)).toEqual([
      "wikipedia-en-6",
      "wikipedia-en-5",
      "wikipedia-en-4",
      "wikipedia-en-3",
      "wikipedia-en-2",
      "wikipedia-en-1",
    ]);
    items = recentViews(items, { id: "wikipedia-en-7", title: "Article 7", source: "Wikipedia" }, viewedAt);
    expect(items).toHaveLength(6);
    expect(items[0]?.id).toBe("wikipedia-en-7");
    expect(items.some((item) => item.id === "wikipedia-en-1")).toBe(false);
  });

  test("moves a repeated view to the front", () => {
    const items = recentViews(
      [{ id: "wikipedia-en-1", title: "First", source: "Wikipedia", viewedAt }],
      { id: "wikipedia-en-1", title: "First", source: "Wikipedia" },
      "2026-10-10T01:00:00.000Z",
    );
    expect(items).toHaveLength(1);
    expect(items[0]?.viewedAt).toBe("2026-10-10T01:00:00.000Z");
  });
});
