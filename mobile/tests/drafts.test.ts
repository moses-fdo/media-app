import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearDrafts, draftEpoch, draftKey, parseDraft, writeDraft, SavedDraft } from '../src/features/requests/drafts';
const draft = { version:1, savedAt:Date.now(), fields:{title:'Draft',organizer:'',venue:'',contact:'',date:'',time:'',setupDate:'',setupTime:'',summary:'',priority:'medium',equipment:[]} } as SavedDraft;
test('logout removes drafts, preserves appearance, and fences late writes from the old account', async()=>{
 const epoch=draftEpoch(),key=draftKey('w','u','new');
 await AsyncStorage.setItem('media-appearance','dark');
 await writeDraft(key,draft,epoch);
 await clearDrafts();
 await writeDraft(key,draft,epoch);
 expect(await AsyncStorage.getItem(key)).toBeNull();
 expect(await AsyncStorage.getItem('media-appearance')).toBe('dark');
});
test('expired and malformed drafts do not open broken editors',()=>{
 expect(parseDraft('{bad')).toBeNull();
 expect(parseDraft(JSON.stringify({...draft,savedAt:Date.now()-8*86400000}))).toBeNull();
 expect(parseDraft(JSON.stringify({...draft,fields:{...draft.fields,equipment:[null]}}))).toBeNull();
});
