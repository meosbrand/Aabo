/**
 * Baileys authentication state persisted in the database (WaAuthKey), so linked devices
 * survive restarts and redeploys. Mirrors Baileys' useMultiFileAuthState, minus the files.
 */

import type { AuthenticationCreds, AuthenticationState, SignalDataTypeMap } from '@whiskeysockets/baileys';
import { prisma } from '@/server/db';
import type { Baileys } from './baileys';

export async function loadPrismaAuthState(sessionId: string, b: Baileys): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> {
  const read = async (key: string) => {
    const row = await prisma.waAuthKey.findUnique({ where: { sessionId_key: { sessionId, key } } });
    return row ? JSON.parse(row.value, b.BufferJSON.reviver) : null;
  };
  const write = async (key: string, data: unknown) => {
    const value = JSON.stringify(data, b.BufferJSON.replacer);
    await prisma.waAuthKey.upsert({
      where: { sessionId_key: { sessionId, key } },
      create: { sessionId, key, value },
      update: { value },
    });
  };
  const remove = async (key: string) => {
    await prisma.waAuthKey.deleteMany({ where: { sessionId, key } });
  };

  const creds: AuthenticationCreds = (await read('creds')) || b.initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
          const data: { [id: string]: SignalDataTypeMap[T] } = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await read(`${type}-${id}`);
              if (type === 'app-state-sync-key' && value) value = b.proto.Message.AppStateSyncKeyData.fromObject(value);
              if (value) data[id] = value;
            }),
          );
          return data;
        },
        set: async (data) => {
          const tasks: Promise<void>[] = [];
          for (const category of Object.keys(data) as Array<keyof SignalDataTypeMap>) {
            const entries = data[category] ?? {};
            for (const id of Object.keys(entries)) {
              const value = entries[id];
              const key = `${category}-${id}`;
              tasks.push(value ? write(key, value) : remove(key));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: () => write('creds', creds),
  };
}

export async function clearAuthState(sessionId: string) {
  await prisma.waAuthKey.deleteMany({ where: { sessionId } });
}
