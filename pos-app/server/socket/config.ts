export function getSocketPort() {
  const isRailwayRuntime = Boolean(
    process.env.RAILWAY_ENVIRONMENT_ID || process.env.RAILWAY_SERVICE_ID,
  );

  return Number(
    process.env.SOCKET_PORT ??
      (isRailwayRuntime ? process.env.PORT : undefined) ??
      3001,
  );
}

export function getAllowedSocketOrigins() {
  return Array.from(
    new Set(
      [
        process.env.REALTIME_ALLOWED_ORIGINS,
        process.env.BETTER_AUTH_TRUSTED_ORIGINS,
        "http://localhost:3000",
        "http://192.168.1.58:3000",
      ]
        .flatMap((value) => value?.split(",") ?? [])
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  );
}

export function isAllowedSocketOrigin({
  allowedOrigins,
  origin,
}: {
  allowedOrigins: string[];
  origin: string | undefined;
}) {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Vercel creates preview/prod domains dynamically. Allowing Vercel-hosted
  // SparkServe builds keeps realtime usable across redeploys without manually
  // editing Railway env vars for every preview URL.
  try {
    const host = new URL(origin).hostname;
    return host === "vercel.app" || host.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

type SocketCorsOriginCallback = (
  error: Error | null,
  origin?: string | boolean,
) => void;

export function createSocketCorsOptions(allowedOrigins: string[]) {
  return {
    origin(origin: string | undefined, callback: SocketCorsOriginCallback) {
      if (isAllowedSocketOrigin({ allowedOrigins, origin })) {
        callback(null, origin ?? true);
        return;
      }

      console.warn(`Blocked realtime CORS origin: ${origin}`);
      callback(null, false);
    },
    methods: ["GET", "POST"],
    credentials: true,
  };
}
