import { describe, expect, it } from "vitest";
import { collectViolations, deriveAnswer } from "../../workbook/errorHunt";
import { CONSTRUCTION_OPTIONS, ERR_ITEMS, VL_ITEMS, VL_OPTIONS } from "./wb06data";

/** Every planted error must be exactly the one the rule engine derives -
 *  otherwise the exercise would mark a musically-correct diagnosis wrong. */

describe("unit 6 construction error items", () => {
  ERR_ITEMS.forEach((item, i) => {
    it(`item ${i + 1} derives "${item.intended}"`, () => {
      const found = collectViolations([item.chord], item.expected);
      expect(deriveAnswer(found, CONSTRUCTION_OPTIONS, "none")).toBe(item.intended);
      // and the flaw must be unambiguous: at most one option category hit
      const hit = CONSTRUCTION_OPTIONS.filter(
        (o) => o.value !== "none" && found.some((v) => o.rules.includes(v.rule))
      );
      expect(hit.length).toBeLessThanOrEqual(1);
    });
  });
});

describe("unit 6 voice-leading error items", () => {
  VL_ITEMS.forEach((item, i) => {
    it(`item ${i + 1} derives "${item.intended}"`, () => {
      const found = collectViolations(item.pair);
      expect(deriveAnswer(found, VL_OPTIONS, "none")).toBe(item.intended);
      const hit = VL_OPTIONS.filter(
        (o) => o.value !== "none" && found.some((v) => o.rules.includes(v.rule))
      );
      expect(hit.length).toBeLessThanOrEqual(1);
    });
  });
});
