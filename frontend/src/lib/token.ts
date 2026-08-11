import * as SecureStore from "expo-secure-store";

const LEGACY_ACCESS_TOKEN_KEY = "access_token";
const SECURE_CHUNK_SIZE = 1800;

function chunkCountKey(key: string) {
  return `${key}.__chunks`;
}

function chunkKey(key: string, index: number) {
  return `${key}.__chunk.${index}`;
}

async function removeChunkedValue(key: string) {
  const countValue = await SecureStore.getItemAsync(chunkCountKey(key));
  const count = Number(countValue);
  if (Number.isInteger(count) && count > 0 && count <= 20) {
    await Promise.all(
      Array.from({ length: count }, (_, index) =>
        SecureStore.deleteItemAsync(chunkKey(key, index))
      )
    );
  }
  await SecureStore.deleteItemAsync(chunkCountKey(key));
  await SecureStore.deleteItemAsync(key);
}

export const supabaseStorage = {
  async getItem(key: string) {
    const countValue = await SecureStore.getItemAsync(chunkCountKey(key));
    const count = Number(countValue);
    if (!Number.isInteger(count) || count <= 0 || count > 20) {
      return SecureStore.getItemAsync(key);
    }

    const chunks = await Promise.all(
      Array.from({ length: count }, (_, index) =>
        SecureStore.getItemAsync(chunkKey(key, index))
      )
    );
    return chunks.every((chunk): chunk is string => chunk !== null)
      ? chunks.join("")
      : null;
  },
  async setItem(key: string, value: string) {
    await removeChunkedValue(key);
    const chunks = Array.from(
      { length: Math.ceil(value.length / SECURE_CHUNK_SIZE) },
      (_, index) => value.slice(index * SECURE_CHUNK_SIZE, (index + 1) * SECURE_CHUNK_SIZE)
    );
    await Promise.all(
      chunks.map((chunk, index) =>
        SecureStore.setItemAsync(chunkKey(key, index), chunk)
      )
    );
    await SecureStore.setItemAsync(chunkCountKey(key), String(chunks.length));
  },
  removeItem: removeChunkedValue,
};

export async function clearLegacyToken() {
  await SecureStore.deleteItemAsync(LEGACY_ACCESS_TOKEN_KEY);
}

export async function clearPersistedSupabaseSession() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return;
  const projectRef = supabaseUrl.replace(/^https?:\/\//, "").split(".")[0];
  if (!projectRef) return;
  await removeChunkedValue(`sb-${projectRef}-auth-token`);
}
