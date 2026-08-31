import { hash } from "bcryptjs";
import { prisma } from "../lib/prisma.ts";

const SALT_ROUNDS = 10;

export async function changePassword(userId: string, newPassword: string) {
  const passwordHash = await hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: false },
  });
}
