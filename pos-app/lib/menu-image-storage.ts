import { createHash, createHmac, randomBytes } from "node:crypto";

const MAX_MENU_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
};

function getR2Config(): R2Config | null {
  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET,
    R2_PUBLIC_BASE_URL,
  } = process.env;

  if (
    !R2_ACCOUNT_ID ||
    !R2_ACCESS_KEY_ID ||
    !R2_SECRET_ACCESS_KEY ||
    !R2_BUCKET ||
    !R2_PUBLIC_BASE_URL
  ) {
    return null;
  }

  return {
    accountId: R2_ACCOUNT_ID,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucket: R2_BUCKET,
    publicBaseUrl: R2_PUBLIC_BASE_URL.replace(/\/$/, ""),
  };
}

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function hexHash(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex");
}

function getSigningKey(secretAccessKey: string, dateStamp: string) {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, "auto");
  const serviceKey = hmac(regionKey, "s3");

  return hmac(serviceKey, "aws4_request");
}

function toAmzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function toDateStamp(date: Date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function createImageKey(extension: string) {
  const token = randomBytes(12).toString("hex");

  return `menu/${new Date().getFullYear()}/${token}.${extension}`;
}

function signR2PutRequest({
  bodyHash,
  config,
  contentType,
  host,
  key,
  now,
}: {
  bodyHash: string;
  config: R2Config;
  contentType: string;
  host: string;
  key: string;
  now: Date;
}) {
  const amzDate = toAmzDate(now);
  const dateStamp = toDateStamp(now);
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const canonicalUri = `/${config.bucket}/${key
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  const canonicalHeaders = [
    `content-type:${contentType}`,
    `host:${host}`,
    `x-amz-content-sha256:${bodyHash}`,
    `x-amz-date:${amzDate}`,
  ].join("\n");
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    "",
    `${canonicalHeaders}\n`,
    signedHeaders,
    bodyHash,
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    hexHash(canonicalRequest),
  ].join("\n");
  const signature = createHmac(
    "sha256",
    getSigningKey(config.secretAccessKey, dateStamp),
  )
    .update(stringToSign)
    .digest("hex");

  return {
    amzDate,
    authorization: [
      `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}`,
      `SignedHeaders=${signedHeaders}`,
      `Signature=${signature}`,
    ].join(", "),
  };
}

// Uploads owner-provided menu photos to Cloudflare R2 using the S3-compatible API.
export async function uploadMenuImageToR2(file: File) {
  if (file.size === 0) {
    return null;
  }

  if (file.size > MAX_MENU_IMAGE_BYTES) {
    throw new Error("Menu image must be 4MB or smaller.");
  }

  const extension = ALLOWED_IMAGE_TYPES.get(file.type);

  if (!extension) {
    throw new Error("Menu image must be JPG, PNG, WebP, or GIF.");
  }

  const config = getR2Config();

  if (!config) {
    throw new Error(
      "Menu image upload is not configured. Add R2 env vars or keep the existing image.",
    );
  }

  const body = Buffer.from(await file.arrayBuffer());
  const bodyHash = hexHash(body);
  const key = createImageKey(extension);
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const now = new Date();
  const signed = signR2PutRequest({
    bodyHash,
    config,
    contentType: file.type,
    host,
    key,
    now,
  });
  const response = await fetch(`https://${host}/${config.bucket}/${key}`, {
    method: "PUT",
    body,
    headers: {
      Authorization: signed.authorization,
      "Content-Type": file.type,
      "x-amz-content-sha256": bodyHash,
      "x-amz-date": signed.amzDate,
    },
  });

  if (!response.ok) {
    throw new Error(`Menu image upload failed with status ${response.status}.`);
  }

  return `${config.publicBaseUrl}/${key}`;
}
