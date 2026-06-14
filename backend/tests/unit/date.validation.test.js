// Tests 4–5: Date validation logic

function isValidDate(value) {
  if (!value) return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

describe("Date Validation", () => {
  test("Test 4: invalid and unrealistic date strings are rejected", () => {
    expect(isValidDate("not-a-date")).toBe(false);
    expect(isValidDate("32/13/2024")).toBe(false);
    expect(isValidDate("")).toBe(false);
    expect(isValidDate(null)).toBe(false);
    expect(isValidDate(undefined)).toBe(false);
  });

  test("Test 5: extreme date values do not throw an Invalid time value error", () => {
    const extremes = ["9999-12-31", "0001-01-01", "2099-06-15"];
    for (const val of extremes) {
      expect(() => {
        const d = new Date(val);
        d.toISOString();
      }).not.toThrow();
    }
  });
});
