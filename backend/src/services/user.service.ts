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

export const listUsers = async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      isMaster: true,
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });

  return users;
};

export const updateProfile = async (userId: string, name: string) => {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { name },
    select: {
      id: true,
      name: true,
    },
  });

  return updatedUser;
};

export const getUserById = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      isMaster: true,
    },
  });

  return user;
};

export const reactivateUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (user.active) {
    throw new AppError(400, "User is already active");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { active: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      isMaster: true,
    },
  });

  return updatedUser;
};

export const deactivateUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (!user.active) {
    throw new AppError(400, "User is already inactive");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { active: false },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      isMaster: true,
    },
  });

  return updatedUser;
};
