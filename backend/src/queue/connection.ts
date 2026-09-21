import { Redis } from "ioredis";

const redisOptions = () => {
  const url = new URL(process.env.REDIS_URL || "redis://localhost:6379");
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : undefined,
    ...(url.protocol === "rediss:" ? { tls: {} } : {}),
  };
};

const withErrorLog = (connection: Redis) => {
  connection.on("error", (err) =>
    console.error("[redis] connection error:", err.message),
  );
  return connection;
};

// BullMQ cannot load ioredis by itself in native ESM, so the client is built
// here and handed over. The caller owns it and must `quit()` it on shutdown.

// API side: fail fast instead of buffering commands while Redis is down, so
// a request never hangs just because the queue is unavailable.
export const createQueueConnection = () =>
  withErrorLog(new Redis({ ...redisOptions(), enableOfflineQueue: false }));

// BullMQ requires `maxRetriesPerRequest: null` on worker connections.
export const createWorkerConnection = () =>
  withErrorLog(new Redis({ ...redisOptions(), maxRetriesPerRequest: null }));
