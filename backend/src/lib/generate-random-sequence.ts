import { randomBytes } from "crypto";

export function generateRandomSequence() {
  return randomBytes(9).toString("base64url"); // ~12 chars
}
