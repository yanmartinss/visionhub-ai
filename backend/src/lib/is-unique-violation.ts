// Prisma error code for a violated unique constraint.
export const isUniqueViolation = (err: unknown) =>
  typeof err === "object" &&
  err !== null &&
  "code" in err &&
  err.code === "P2002";
