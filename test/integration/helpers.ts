export function req(path: string, init?: RequestInit): Request {
  return new Request(`http://localhost${path}`, init);
}

export function jsonReq(
  path: string,
  method: string,
  body: unknown,
): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function ctx(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

export async function body<T = unknown>(res: Response): Promise<T> {
  return (await res.json()) as T;
}
