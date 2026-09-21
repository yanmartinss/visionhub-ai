import z from "zod";

// `date` is a calendar day (YYYY-MM-DD), stored as a DATE column.
export const recordingDateSchema = z.iso
  .date()
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

export const createRecordingDaySchema = z.object({
  cameraId: z.uuid(),
  date: recordingDateSchema,
});
