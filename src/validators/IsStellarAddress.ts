import { registerDecorator, ValidationOptions } from "class-validator";

export function IsStellarAddress(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isStellarAddress",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return (
            typeof value === "string" &&
            value.length === 56 &&
            value.startsWith("G")
          );
        },
      },
    });
  };
}
