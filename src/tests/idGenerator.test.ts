import { generateUniqueId } from "../utils/idGenerator";

describe("ID Generator", () => {
  it("should generate a string of length 12", async () => {
    const id = await generateUniqueId();
    expect(id.length).toBe(12);
  });

  it("should generate unique IDs", async () => {
    const id1 = await generateUniqueId();
    const id2 = await generateUniqueId();
    expect(id1).not.toBe(id2);
  });
});
