import { pbkdf2, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const pbkdf2Async = promisify(pbkdf2);
const HASH_ALGORITHM = "sha256";
const HASH_PREFIX = "pbkdf2_sha256";
const DEFAULT_ITERATIONS = 120_000;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

type HashPasswordOptions = {
  iterations?: number;
};

export async function hashPassword(
  password: string,
  options: HashPasswordOptions = {},
): Promise<string> {
  const iterations = options.iterations ?? DEFAULT_ITERATIONS;
  const salt = randomBytes(SALT_LENGTH).toString("base64url");
  const derivedKey = await pbkdf2Async(
    password,
    salt,
    iterations,
    KEY_LENGTH,
    HASH_ALGORITHM,
  );

  return [
    HASH_PREFIX,
    iterations.toString(),
    salt,
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  passwordHash: string | null | undefined,
): Promise<boolean> {
  if (!passwordHash) {
    return false;
  }

  const [prefix, iterationsRaw, salt, expectedHash] = passwordHash.split("$");
  const iterations = Number.parseInt(iterationsRaw ?? "", 10);

  if (
    prefix !== HASH_PREFIX ||
    !Number.isInteger(iterations) ||
    iterations <= 0 ||
    !salt ||
    !expectedHash
  ) {
    return false;
  }

  const actual = await pbkdf2Async(
    password,
    salt,
    iterations,
    KEY_LENGTH,
    HASH_ALGORITHM,
  );
  const expected = Buffer.from(expectedHash, "base64url");

  if (actual.byteLength !== expected.byteLength) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}
