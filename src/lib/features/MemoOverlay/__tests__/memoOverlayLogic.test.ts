import { describe, it, expect } from "vitest";
import { 
  parseTimeStr, 
  getValidationError, 
  createSavePayload 
} from "../memoOverlayLogic";

describe("parseTimeStr", () => {
  it("should parse empty string", () => {
    const res = parseTimeStr("");
    expect(res.display).toBe("--:--");
    expect(res.empty).toBe(true);
  });

  it("should parse '123' to '1:23'", () => {
    const res = parseTimeStr("123");
    expect(res.display).toBe("1:23");
    expect(res.isInvalid).toBe(false);
  });

  it("should detect invalid seconds", () => {
    const res = parseTimeStr("60");
    expect(res.display).toBe("0:60");
    expect(res.isInvalid).toBe(true);
  });
});

describe("getValidationError", () => {
  it("should return error for empty time in EVENT mode", () => {
    const err = getValidationError({
      mode: "EVENT",
      phase: 0,
      timeStr: "",
      selectedLabels: []
    });
    expect(err).toBe("時間を入力してください。");
  });

  it("should return error for no labels in label phase", () => {
    const err = getValidationError({
      mode: "EVENT",
      phase: 1,
      timeStr: "123",
      selectedLabels: []
    });
    expect(err).toBe("ラベルを1つ以上選択してください。");
  });
});

describe("createSavePayload", () => {
  it("should create correct EVENT payload", () => {
    const payload = createSavePayload({
      mode: "EVENT",
      timeStr: "123",
      selectedLabels: ["Tag1"],
      memo: "Test"
    });
    expect(payload).toEqual({
      type: "EVENT",
      minute: 1,
      second: 23,
      labels: ["Tag1"],
      memo: "Test"
    });
  });
});
