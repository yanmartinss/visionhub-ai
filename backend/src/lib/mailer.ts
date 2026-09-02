import nodemailer from "nodemailer";

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;

const smtpConfigured = Boolean(
  SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS,
);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

if (transporter) {
  transporter
    .verify()
    .then(() => console.log("[mailer] SMTP pronto para envio"))
    .catch((err) =>
      console.error("[mailer] SMTP indisponível:", err?.message ?? err),
    );
}

type SendResult = { delivered: boolean; tempPassword: string };

export async function sendTempPassword(
  to: string,
  tempPassword: string,
  loginUrl: string,
): Promise<SendResult> {
  const text =
    `Seu acesso ao VisionHub AI foi aprovado.\n\n` +
    `E-mail: ${to}\n` +
    `Senha temporária: ${tempPassword}\n\n` +
    `Entre em ${loginUrl} e defina uma nova senha no primeiro acesso.`;

  if (!transporter) {
    console.log(
      `[mailer] SMTP não configurado. Senha temporária de ${to}: ${tempPassword}`,
    );
    return { delivered: false, tempPassword };
  }

  try {
    await transporter.sendMail({
      from: MAIL_FROM || "VisionHub AI <no-reply@visionhub.ai>",
      to,
      subject: "Acesso aprovado — VisionHub AI",
      text,
    });
    return { delivered: true, tempPassword };
  } catch (err) {
    console.error(
      `[mailer] Falha ao enviar e-mail para ${to}:`,
      err instanceof Error ? err.message : err,
    );
    return { delivered: false, tempPassword };
  }
}

export const sendPasswordReset = async (
  to: string,
  resetUrl: string,
): Promise<boolean> => {
  const text =
    `Você solicitou a redefinição de senha para sua conta no VisionHub AI.\n\n` +
    `Clique no link abaixo para redefinir sua senha:\n` +
    `${resetUrl}\n\n` +
    `Se você não solicitou a redefinição de senha, ignore este e-mail.`;

  if (!transporter) {
    console.log(
      `[mailer] SMTP não configurado. Link de redefinição de senha para ${to}: ${resetUrl}`,
    );
    return false;
  }

  try {
    await transporter.sendMail({
      from: MAIL_FROM || "VisionHub AI <no-reply@visionhub.ai>",
      to,
      subject: "Redefinição de senha — VisionHub AI",
      text,
    });
    return true;
  } catch (err) {
    console.error(
      `[mailer] Falha ao enviar e-mail para ${to}:`,
      err instanceof Error ? err.message : err,
    );
    return false;
  }
};
