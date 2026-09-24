import { registerDecorator, ValidationOptions } from 'class-validator';

// Validates a comma-joined multi-select string (e.g. "IAM,DEVOPS_CLOUD")
// against a fixed set of allowed tokens — class-validator's built-in
// @IsIn only checks the whole value, not each item of a CSV string, so
// this small custom decorator fills that gap for Client.industry (see
// client.constants.ts for why it's a CSV column rather than a join table).
export function IsCommaSeparatedIn(allowed: readonly string[], validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCommaSeparatedIn',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (value == null || value === '') return true;
          if (typeof value !== 'string') return false;
          const tokens = value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          return tokens.length > 0 && tokens.every((t) => allowed.includes(t));
        },
        defaultMessage() {
          return `each value must be one of: ${allowed.join(', ')}`;
        },
      },
    });
  };
}
