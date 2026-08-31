import { ZodError } from "zod";

export function ok<T>(data: T, status = 200): Response {
  return Response.json(data, { status });
}

export function created<T>(data: T): Response {
  return Response.json(data, { status: 201 });
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}

export function badRequest(message: string, details?: unknown): Response {
  return Response.json({ error: message, details }, { status: 400 });
}

export function notFound(message = "리소스를 찾을 수 없습니다"): Response {
  return Response.json({ error: message }, { status: 404 });
}

export function serverError(message = "서버 오류"): Response {
  return Response.json({ error: message }, { status: 500 });
}

/** Zod 파싱 실패를 400 응답으로 변환한다. */
export function fromZodError(err: ZodError): Response {
  return badRequest("입력 값이 유효하지 않습니다", err.flatten());
}

/**
 * route handler 본문을 감싸 공통 예외를 처리한다.
 * - ZodError → 400
 * - CastError(잘못된 ObjectId) → 404
 * - 그 외 → 500
 */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ZodError) return fromZodError(err);
    if (
      err &&
      typeof err === "object" &&
      "name" in err &&
      (err as { name: string }).name === "CastError"
    ) {
      return notFound();
    }
    console.error(err);
    return serverError();
  }
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
