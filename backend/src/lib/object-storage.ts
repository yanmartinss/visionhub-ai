import {
  CreateBucketCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createReadStream } from "node:fs";
import type { Readable } from "node:stream";

// Clips and thumbnails live in MinIO (S3 compatible). `events.clipPath` and
// `events.thumbnailPath` store the object key, never a URL.
const bucket = () => process.env.S3_BUCKET || "visionhub";

let client: S3Client | null = null;

const getClient = () => {
  client ??= new S3Client({
    endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
    region: process.env.S3_REGION || "us-east-1",
    // MinIO addresses buckets by path, not by subdomain.
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY || "minioadmin",
      secretAccessKey: process.env.S3_SECRET_KEY || "minioadmin",
    },
  });
  return client;
};

export const ensureBucket = async () => {
  try {
    await getClient().send(new HeadBucketCommand({ Bucket: bucket() }));
  } catch {
    await getClient().send(new CreateBucketCommand({ Bucket: bucket() }));
  }
};

// Streams a local file up (clips are small, but never buffer video in memory).
export const putFile = async (
  key: string,
  filePath: string,
  contentType: string,
  sizeBytes: number,
) => {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: createReadStream(filePath),
      ContentType: contentType,
      ContentLength: sizeBytes,
    }),
  );
};

export const getObjectStream = async (key: string) => {
  const res = await getClient().send(
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
  );
  return {
    stream: res.Body as Readable,
    contentType: res.ContentType ?? "application/octet-stream",
    contentLength: res.ContentLength ?? null,
  };
};

export const deleteObject = async (key: string) => {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: bucket(), Key: key }),
  );
};

// S3 accepts up to 1000 keys per request.
export const deleteObjects = async (keys: string[]) => {
  for (let i = 0; i < keys.length; i += 1000) {
    await getClient().send(
      new DeleteObjectsCommand({
        Bucket: bucket(),
        Delete: {
          Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    );
  }
};

export const pingObjectStorage = async () => {
  try {
    await getClient().send(new HeadBucketCommand({ Bucket: bucket() }));
    return true;
  } catch {
    return false;
  }
};

// The DB row can outlive the object (retention, manual cleanup).
export const isMissingObject = (err: unknown) =>
  err instanceof Error && (err.name === "NoSuchKey" || err.name === "NotFound");

export type StoredObject = { key: string; lastModified: Date };

// Pages of up to 1000 keys under `prefix`, so the caller never holds the
// whole bucket in memory.
export async function* listObjectPages(
  prefix: string,
): AsyncGenerator<StoredObject[]> {
  let token: string | undefined;
  do {
    const res = await getClient().send(
      new ListObjectsV2Command({
        Bucket: bucket(),
        Prefix: prefix,
        ContinuationToken: token,
      }),
    );
    yield (res.Contents ?? []).flatMap((o) =>
      o.Key && o.LastModified
        ? [{ key: o.Key, lastModified: o.LastModified }]
        : [],
    );
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
}
