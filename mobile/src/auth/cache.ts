import { clearDrafts } from '../features/requests/drafts';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function clearWorkspaceCache() {
  await clearDrafts();
  const keys = (await AsyncStorage.getAllKeys()).filter(key => key.startsWith('media-cache:'));
  if (keys.length) await AsyncStorage.multiRemove(keys);
}
