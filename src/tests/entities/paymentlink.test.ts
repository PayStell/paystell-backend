import "reflect-metadata";
import { getMetadataArgsStorage } from "typeorm";
import { PaymentLink } from "../../entities/PaymentLink";

describe("PaymentLink Entity", () => {
  it("should have the correct columns", () => {
    const columns = getMetadataArgsStorage().columns.filter(
      (col) => col.target === PaymentLink,
    );

    const expectedColumns = [
      "id",
      "name",
      "sku",
      "amount",
      "currency",
      "status",
      "description",
      "expirationDate",
      "createdAt",
      "updatedAt",
    ];

    const entityColumns = columns.map((col) => col.propertyName);
    expectedColumns.forEach((column) => {
      expect(entityColumns).toContain(column);
    });
  });

  it("should have a UUID as primary key", () => {
    const primaryColumn = getMetadataArgsStorage().columns.find(
      (col) => col.target === PaymentLink && col.options.primary,
    );
    expect(primaryColumn).toBeDefined();
    expect(primaryColumn?.propertyName).toBe("id");
    expect(primaryColumn?.options.type).toBe("uuid");
  });

  it("should have unique constraint on sku", () => {
    const skuColumn = getMetadataArgsStorage().columns.find(
      (col) => col.target === PaymentLink && col.propertyName === "sku",
    );
    expect(skuColumn).toBeDefined();
    expect(skuColumn?.options.unique).toBe(true);
  });

  it("should have a default value for status", () => {
    const statusColumn = getMetadataArgsStorage().columns.find(
      (col) => col.target === PaymentLink && col.propertyName === "status",
    );
    expect(statusColumn).toBeDefined();
    expect(statusColumn?.options.default).toBe("active");
  });

  it("should allow nullable description and expirationDate", () => {
    const descriptionColumn = getMetadataArgsStorage().columns.find(
      (col) => col.target === PaymentLink && col.propertyName === "description",
    );
    expect(descriptionColumn).toBeDefined();
    expect(descriptionColumn?.options.nullable).toBe(true);

    const expirationDateColumn = getMetadataArgsStorage().columns.find(
      (col) =>
        col.target === PaymentLink && col.propertyName === "expirationDate",
    );
    expect(expirationDateColumn).toBeDefined();
    expect(expirationDateColumn?.options.nullable).toBe(true);
  });
});
