import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePolling } from "../usePolling";

describe("usePolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does nothing when disabled", () => {
    const callback = vi.fn();
    renderHook(() => usePolling(callback, 1000, false));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(callback).not.toHaveBeenCalled();
  });

  it("calls callback on each interval when visible", () => {
    const callback = vi.fn();
    Object.defineProperty(document, "hidden", { value: false, writable: true });
    renderHook(() => usePolling(callback, 1000, true));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(callback).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("skips ticks while hidden", () => {
    const callback = vi.fn();
    Object.defineProperty(document, "hidden", { value: true, writable: true });
    renderHook(() => usePolling(callback, 1000, true));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(callback).not.toHaveBeenCalled();
    Object.defineProperty(document, "hidden", { value: false, writable: true });
  });
});