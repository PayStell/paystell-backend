import { generateUniqueId } from "../utils/idGenerator";

describe("ID Generator", () => {
  it("should generate a string of length 12", () => {
    const id = generateUniqueId();
    expect(id.length).toBe(12);
  });

  it("should generate unique IDs", () => {
    const id1 = generateUniqueId();
    const id2 = generateUniqueId();
    expect(id1).not.toBe(id2);
  });
});
