import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsStellarAddress(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isStellarAddress',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any) {
                    return typeof value === 'string' && 
                           value.length === 56 && 
                           value.startsWith('G');
                }
            }
        });
    };
}
