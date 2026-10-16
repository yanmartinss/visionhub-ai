import type { EventTypeValue } from "../lib/event-types.ts";
import { sendNotification } from "../lib/mailer.ts";
import { prisma } from "../lib/prisma.ts";

// "Alerta grave" (US37): ocorrências que envolvem risco imediato a pessoas ou
// acesso indevido e por isso não podem esperar o resumo do dia. Os demais
// tipos (portão aberto, carro irregular, objeto, dejeto) só aparecem no resumo.
export const SEVERE_EVENT_TYPES: readonly EventTypeValue[] = [
  "childRunning",
  "restrictedArea",
  "occupancy",
];

export const isSevereEventType = (type: EventTypeValue): boolean =>
  SEVERE_EVENT_TYPES.includes(type);

const EVENT_LABELS: Record<EventTypeValue, string> = {
  gateOpen: "Portão aberto",
  occupancy: "Permanência suspeita",
  restrictedArea: "Acesso a área restrita",
  abandonedObject: "Objeto abandonado",
  illegalParking: "Carro em local inapropriado",
  childRunning: "Criança correndo",
  petWaste: "Necessidade de animal não recolhida",
  other: "Outro",
};

const appUrl = () => process.env.APP_URL ?? "http://localhost:5173";

// Gestores e administradores ativos (há um único condomínio no MVP).
const loadRecipients = async (): Promise<string[]> => {
  const users = await prisma.user.findMany({
    where: { active: true, role: { in: ["manager", "admin"] } },
    select: { email: true },
  });
  return users.map((user) => user.email);
};

const formatDateTime = (date: Date): string =>
  date.toLocaleString("pt-BR", {
    timeZone: process.env.SUMMARY_TIMEZONE ?? "America/Sao_Paulo",
  });

// Envia o e-mail do alerta grave. Só os dados do evento (tipo, câmera, horário);
// sem imagem nem clipe. Nunca rejeita.
export const notifySevereEvent = async (eventId: string): Promise<void> => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        type: true,
        startedAt: true,
        technicalDescription: true,
        camera: { select: { name: true, location: true } },
      },
    });
    if (!event || !isSevereEventType(event.type)) return;

    const recipients = await loadRecipients();
    const label = EVENT_LABELS[event.type];
    const text =
      `Alerta grave detectado pelo VisionHub AI.\n\n` +
      `Ocorrência: ${label}\n` +
      `Câmera: ${event.camera.name} (${event.camera.location})\n` +
      `Horário: ${formatDateTime(event.startedAt)}\n` +
      (event.technicalDescription ? `${event.technicalDescription}\n` : "") +
      `\nAbra o evento em ${appUrl()}/history para revisar e triar.`;

    await sendNotification(
      recipients,
      `[Alerta] ${label} — ${event.camera.name}`,
      text,
    );
  } catch (err) {
    console.error(
      `[notification] severe alert failed for event ${eventId}:`,
      err,
    );
  }
};

// Envia o resumo do dia por e-mail, uma vez por lote (`emailedAt`). A coluna é
// reivindicada antes do envio para que duas finalizações seguidas não dupliquem;
// se o envio falhar, é liberada e a próxima refinalização tenta de novo.
export const notifyDailySummary = async (
  recordingDayId: string,
): Promise<void> => {
  try {
    const claim = await prisma.dailySummary.updateMany({
      where: { recordingDayId, emailedAt: null },
      data: { emailedAt: new Date() },
    });
    if (claim.count === 0) return;

    const summary = await prisma.dailySummary.findUnique({
      where: { recordingDayId },
      select: {
        generatedText: true,
        referenceDate: true,
        recordingDay: { select: { camera: { select: { name: true } } } },
      },
    });
    if (!summary) return;

    const cameraName = summary.recordingDay?.camera.name ?? "câmera";
    const date = summary.referenceDate.toLocaleDateString("pt-BR", {
      timeZone: "UTC",
    });
    const recipients = await loadRecipients();
    const delivered = await sendNotification(
      recipients,
      `Resumo do dia ${date} — ${cameraName}`,
      `${summary.generatedText}\n\nDetalhes em ${appUrl()}/recordings/${recordingDayId}`,
    );
    if (!delivered) {
      await prisma.dailySummary.updateMany({
        where: { recordingDayId },
        data: { emailedAt: null },
      });
    }
  } catch (err) {
    console.error(
      `[notification] summary email failed for ${recordingDayId}:`,
      err,
    );
  }
};
