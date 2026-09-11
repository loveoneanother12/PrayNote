type QueryError = { code?: string; message?: string; status?: number } | null;
type QueryResult = { data: unknown; error: QueryError };

export function isRetryableReadError(error: QueryError) {
  if (!error) return false;
  return Number(error.status ?? 0) >= 500
    || /^PGRST00[012]$/.test(error.code ?? "")
    || /failed to fetch|network|timeout|connection|load failed/i.test(error.message ?? "");
}

export async function retrySupabaseRead<T extends QueryResult>(operation: () => PromiseLike<T>): Promise<T> {
  const first = await operation();
  if (!isRetryableReadError(first.error)) return first;
  await new Promise((resolve) => setTimeout(resolve, 120));
  return operation();
}
