import { existsSync, readFileSync, writeFileSync } from 'node:fs';
// The process-restart test uses a file across two independent Node processes.
// Other tests use memory so they can independently reset device storage.
const file = process.env.STUDY_TEST_STORAGE;
export const disk = new Map<string, string>(
  file && existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [],
);
export default {
  async getAllKeys() { return [...disk.keys()]; },
  async getItem(key: string) { return disk.get(key) ?? null; },
  async setItem(key: string, value: string) {
    disk.set(key, value);
    if (file) writeFileSync(file, JSON.stringify([...disk]));
  },
  async removeItem(key: string) {
    disk.delete(key);
    if (file) writeFileSync(file, JSON.stringify([...disk]));
  },
  async multiRemove(keys: string[]) {
    keys.forEach(key => disk.delete(key));
    if (file) writeFileSync(file, JSON.stringify([...disk]));
  },
};
