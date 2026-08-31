import { afterAll, afterEach, beforeAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

/**
 * 통합 테스트용 인메모리 MongoDB 수명주기.
 * 각 테스트 파일 상단에서 `setupMongo()` 를 호출한다.
 */
export function setupMongo(): void {
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    const { connectToDatabase } = await import("@/lib/db");
    await connectToDatabase();
  }, 120_000);

  afterEach(async () => {
    const { collections } = mongoose.connection;
    await Promise.all(
      Object.values(collections).map((c) => c.deleteMany({})),
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    globalThis._mongoose = undefined;
    if (mongod) await mongod.stop();
  });
}
