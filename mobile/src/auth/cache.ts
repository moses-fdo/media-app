import AsyncStorage from '@react-native-async-storage/async-storage';

export async function clearWorkspaceCache() {
  const keys = (await AsyncStorage.getAllKeys()).filter(key => key.startsWith('media-cache:'));
  if (keys.length) await AsyncStorage.multiRemove(keys);
}
