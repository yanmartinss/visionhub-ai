import { beforeEach, describe, expect, it, vi } from "vitest";

const sendNotification = vi.fn();
const userFindMany = vi.fn();
const eventFindUnique = vi.fn();
const summaryUpdateMany = vi.fn();
const summaryFindUnique = vi.fn();

vi.mock("../../lib/mailer.ts", () => ({ sendNotification }));
vi.mock("../../lib/prisma.ts", () => ({
  prisma: {
    user: { findMany: userFindMany },
    event: { findUnique: eventFindUnique },
    dailySummary: {
      updateMany: summaryUpdateMany,
      findUnique: summaryFindUnique,
    },
  },
}));

const { notifySevereEvent, notifyDailySummary, isSevereEventType } =
  await import("../notification.service.ts");

beforeEach(() => {
  vi.clearAllMocks();
  userFindMany.mockResolvedValue([{ email: "a@x.com" }, { email: "b@x.com" }]);
});

describe("isSevereEventType", () => {
  it("flags child/restricted/occupancy only", () => {
    expect(isSevereEventType("childRunning")).toBe(true);
    expect(isSevereEventType("gateOpen")).toBe(false);
  });
});

describe("notifySevereEvent", () => {
  it("emails managers/admins about a severe event", async () => {
    eventFindUnique.mockResolvedValue({
      id: "e1",
      type: "childRunning",
      startedAt: new Date("2026-10-16T12:00:00Z"),
      technicalDescription: "Criança correndo detectado (confiança 90%).",
      camera: { name: "Garagem", location: "Subsolo" },
    });
    await notifySevereEvent("e1");
    expect(sendNotification).toHaveBeenCalledOnce();
    const [recipients, subject] = sendNotification.mock.calls[0]!;
    expect(recipients).toEqual(["a@x.com", "b@x.com"]);
    expect(subject).toContain("Criança correndo");
  });

  it("ignores non-severe events", async () => {
    eventFindUnique.mockResolvedValue({ id: "e2", type: "gateOpen" });
    await notifySevereEvent("e2");
    expect(sendNotification).not.toHaveBeenCalled();
  });
});

describe("notifyDailySummary", () => {
  it("does nothing when already emailed", async () => {
    summaryUpdateMany.mockResolvedValue({ count: 0 });
    await notifyDailySummary("d1");
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("releases the claim when delivery fails", async () => {
    summaryUpdateMany.mockResolvedValue({ count: 1 });
    summaryFindUnique.mockResolvedValue({
      generatedText: "Resumo",
      referenceDate: new Date("2026-10-16T00:00:00Z"),
      recordingDay: { camera: { name: "Garagem" } },
    });
    sendNotification.mockResolvedValue(false);
    await notifyDailySummary("d1");
    expect(summaryUpdateMany).toHaveBeenLastCalledWith({
      where: { recordingDayId: "d1" },
      data: { emailedAt: null },
    });
  });
});
