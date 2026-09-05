import { hash } from "bcryptjs";
import { prisma } from "../lib/prisma.ts";
import { AppError } from "../lib/app-error.ts";
import { generateRandomSequence } from "../lib/generate-random-sequence.ts";
import { sendTempPassword } from "../lib/mailer.ts";

const SALT_ROUNDS = 10;

export async function changePassword(userId: string, newPassword: string) {
  const passwordHash = await hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: false },
  });
}

export const createUser = async (
  name: string,
  email: string,
  role: "admin" | "manager" | "employee",
  isMaster: boolean = false,
) => {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  if (existingUser) {
    throw new AppError(409, "Existing user with this email");
  }

  const tempPassword = generateRandomSequence();
  const passwordHash = await hash(tempPassword, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      active: true,
      mustChangePassword: true,
      isMaster,
    },
  });

  const loginUrl = `${process.env.APP_URL ?? "http://localhost:5173"}/login`;
  const mail = await sendTempPassword(email, tempPassword, loginUrl);

  return {
    emailDelivered: mail.delivered,
    loginUrl,
    user: { name: user.name, role: user.role },
  };
};
