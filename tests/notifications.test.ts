import { describe, expect, it } from "vitest";
import { notificationHref, notificationMessage } from "../lib/notification-queries";

const base = {
  id: "notification-id",
  actor_id: "actor-id",
  group_id: "group-id",
  prayer_id: "prayer-id",
  data: {},
  read_at: null,
  created_at: "2026-09-04T12:00:00.000Z",
} as const;

describe("notification presentation", () => {
  it("keeps prayer content out of notification copy", () => {
    const message = notificationMessage({ ...base, type: "new_prayer" }, "은혜", "청년부");
    expect(message).toBe("은혜님이 ‘청년부’에 새 기도제목을 나눴어요.");
    expect(message).not.toContain("기도 내용");
  });

  it("routes membership requests to group management", () => {
    expect(notificationHref({ ...base, type: "membership_requested", prayer_id: null })).toBe("/groups/group-id/manage");
  });

  it("routes prayer responses to the prayer detail", () => {
    expect(notificationHref({ ...base, type: "prayer_response" })).toBe("/prayers/prayer-id");
  });
});
