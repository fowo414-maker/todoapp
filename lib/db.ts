import mongoose from "mongoose";

/**
 * Mongoose 커넥션 싱글턴.
 *
 * Next.js dev(HMR)에서 모듈이 반복 평가되어도 커넥션이 한 번만 열리도록
 * global 객체에 캐시한다. serverless(빌드/배포) 환경에서도 동일하게 안전하다.
 */

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var _mongoose: MongooseCache | undefined;
}

const cache: MongooseCache = global._mongoose ?? { conn: null, promise: null };
if (!global._mongoose) {
  global._mongoose = cache;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.conn) {
    return cache.conn;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI 환경 변수가 설정되지 않았습니다. .env.local 을 확인하세요.",
    );
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, {
      bufferCommands: false,
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }

  return cache.conn;
}

export default connectToDatabase;
