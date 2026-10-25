import AsyncStorage from '@react-native-async-storage/async-storage';
import { MediaRequest, Requirement } from '../../api/types';
export type EquipmentDraft = Omit<Requirement, 'quantity'> & { quantityText: string };
export type FormDraft = { title: string; organizer: string; venue: string; contact: string; date: string; time: string; setupDate: string; setupTime: string; summary: string; priority: string; equipment: EquipmentDraft[] };
export type SavedDraft = { version: 1; savedAt: number; initial?: MediaRequest; fields: FormDraft };
let pending: Promise<unknown> = Promise.resolve();
let epoch = 0;
export const draftEpoch = () => epoch;
export function draftKey(workspace: string, member: string, request: string) {
 return `media-draft:${encodeURIComponent(workspace)}:${encodeURIComponent(member)}:${encodeURIComponent(request)}`;
}
export function parseDraft(raw: string | null): SavedDraft | null {
 try {
  const value = JSON.parse(raw || 'null');
  if (value?.version !== 1 || typeof value.savedAt !== 'number' || Date.now() - value.savedAt > 7 * 86400000) return null;
  const f = value.fields;
  if (!f || !['title','organizer','venue','contact','date','time','setupDate','setupTime','summary','priority'].every(key => typeof f[key] === 'string')) return null;
  if (!Array.isArray(f.equipment) || f.equipment.length > 100 || !f.equipment.every((item: any) => item && ['id','title','quantityText','notes'].every(key => typeof item[key] === 'string') && ['audio','video','other'].includes(item.department))) return null;
  return value;
 } catch { return null; }
}
export function writeDraft(key: string, value: SavedDraft | null, ownerEpoch: number) {
 pending = pending.catch(() => {}).then(async () => {
  if (ownerEpoch !== epoch) return;
  if (value) await AsyncStorage.setItem(key, JSON.stringify(value)); else await AsyncStorage.removeItem(key);
 });
 return pending;
}
export async function clearDrafts() {
 epoch += 1;
 await pending.catch(() => {});
 const keys = (await AsyncStorage.getAllKeys()).filter(key => key.startsWith('media-draft:'));
 if (keys.length) await AsyncStorage.multiRemove(keys);
}
