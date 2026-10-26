/**
 * Stops accepting connections, lets in-flight requests finish, flushes pending game saves
 * and resolves. If connections do not close within `timeoutMs`, they are destroyed so a
 * deploy cannot hang forever on a keep-alive or stuck client.
 */
export type DrainServer = {
  close(callback?: (err?: Error) => void): unknown;
  closeIdleConnections?: () => void;
  closeAllConnections?: () => void;
};

export type DrainLoader = {
  flush(): Promise<void>;
};

export async function drain(server: DrainServer, loader: DrainLoader, timeoutMs = 15_000): Promise<void> {
  let closed = false;
  const closedPromise = new Promise<void>((resolve) => {
    server.close(() => {
      closed = true;
      resolve();
    });
  });
  server.closeIdleConnections?.();

  const timeout = setTimeout(() => {
    if (!closed) {
      console.warn('Shutdown timed out, closing remaining connections');
      server.closeAllConnections?.();
    }
  }, timeoutMs);
  timeout.unref?.();

  try {
    await closedPromise;
  } finally {
    clearTimeout(timeout);
  }
  await loader.flush();
}
