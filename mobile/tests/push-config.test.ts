const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const configure = require('../app.config');
const savedEnv = {...process.env};
let folder: string;
beforeEach(()=>{folder=mkdtempSync(join(tmpdir(),'media-push-'));delete process.env.GOOGLE_SERVICES_JSON;delete process.env.REQUIRE_ANDROID_PUSH;delete process.env.APP_ENV;delete process.env.EAS_BUILD_PROFILE;delete process.env.EAS_BUILD_PLATFORM;});
afterEach(()=>{process.env={...savedEnv};rmSync(folder,{recursive:true,force:true});});
const config={android:{package:'com.mediaops.staff'},extra:{eas:{projectId:'existing-project'}}};
test('an Android push build cannot silently omit Firebase registration',()=>{
 process.env.REQUIRE_ANDROID_PUSH='true';
 expect(()=>configure({config})).toThrow('google-services.json');
});
test('a matching Firebase client is included while preserving existing Expo project settings',()=>{
 const file=join(folder,'google-services.json');
 writeFileSync(file,JSON.stringify({project_info:{project_number:'123',project_id:'fixture'},client:[{client_info:{mobilesdk_app_id:'1:123:android:abc',android_client_info:{package_name:'com.mediaops.staff'}},api_key:[{current_key:'fixture-key'}]}]}));
 process.env.GOOGLE_SERVICES_JSON=file;
 const result=configure({config});
 expect(result.android.googleServicesFile).toBe(file);
 expect(result.extra.eas.projectId).toBe('existing-project');
 expect(result.extra.notifications.androidConfigured).toBe(true);
});
test('Firebase registration for another Android package is rejected',()=>{
 const file=join(folder,'google-services.json');writeFileSync(file,JSON.stringify({project_info:{project_number:'123'},client:[{client_info:{android_client_info:{package_name:'another.app'}}}]}));
 process.env.GOOGLE_SERVICES_JSON=file;
 expect(()=>configure({config})).toThrow('com.mediaops.staff');
});
