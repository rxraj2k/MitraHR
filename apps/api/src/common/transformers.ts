import { Transform } from 'class-transformer';

// Emails are conventionally case-insensitive (and Employee.email / User.email
// are plain SQLite `String @unique` columns, whose default collation IS
// case-sensitive) — without this, "Sanjay.saraf@..." and
// "sanjay.saraf@..." are treated as two different addresses, so an
// employee logging in with different casing than however their email was
// originally entered gets a silent "no account found" instead of an OTP.
// Apply this on every DTO field that is looked up against, or written into,
// Employee.email / User.email, so writes are normalized at the source and
// reads match regardless of how the address is typed.
export const NormalizeEmail = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));
