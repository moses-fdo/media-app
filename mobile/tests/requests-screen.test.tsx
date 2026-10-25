import {render,screen,fireEvent,waitFor} from '@testing-library/react-native';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import Requests from '../src/app/(tabs)/index';
import {ThemeProvider} from '../src/theme';
jest.mock('expo-router',()=>({router:{push:jest.fn()}}));
let mockPath='';
const mockRefetch=jest.fn().mockResolvedValue({});
let mockStatus='connected';
let mockSynced='2026-10-24T10:00:00Z';
jest.mock('../src/auth/context',()=>({useAuth:()=>({me:{id:'u1',workspace_id:'w1',role:'admin',timezone:'Asia/Kolkata'}}),api:{get:jest.fn(async(path:string)=>path.includes('mailbox')?{status:mockStatus,last_synced:mockSynced,queued:0,email:'media@example.edu'}:{items:[{id:'future',title:'Next event',event_start:'2099-01-01T10:00:00Z',status:'confirmed',venue:'Main Hall',timezone:'Asia/Kolkata',requirements:[]}],next_cursor:null}),post:jest.fn()}}));
jest.mock('../src/features/requests/useCachedQuery',()=>({useCachedQuery:(path:string)=>{mockPath=path;return {data:{items:[],next_cursor:null,counts:{active:0,needs_review:3,completed:0}},isRefetching:false,refetch:mockRefetch};}}));
async function show(){return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}})}><ThemeProvider><Requests/></ThemeProvider></QueryClientProvider>);}
beforeEach(()=>{mockStatus='connected';mockSynced='2026-10-24T10:00:00Z';});
test('active filters remain visible when collapsed and can be reset in one action',async()=>{
 await show();
 await fireEvent.press(screen.getByRole('button',{name:'Filter requests'}));
 await fireEvent.press(screen.getByRole('radio',{name:'Audio'}));
 await fireEvent.press(screen.getByRole('button',{name:'Filter requests'}));
 expect(screen.getByText('Audio equipment')).toBeTruthy();
 await fireEvent.press(screen.getByRole('button',{name:'Clear filters'}));
 expect(mockPath).not.toContain('department=audio');
});
test('next event shortcut opens the request and tabs switch correctly',async()=>{
 const {router}=require('expo-router');await show();
 await waitFor(()=>expect(screen.getByRole('button',{name:/Next event: Next event/})).toBeTruthy());
 await fireEvent.press(screen.getByRole('button',{name:/Next event: Next event/}));
 expect(router.push).toHaveBeenCalledWith('/requests/future');
 await fireEvent.press(screen.getByRole('tab',{name:'Done requests'}));
 expect(mockPath).toContain('tab=completed');
});
test('a connection error offers recovery instead of saying to connect an already connected mailbox',async()=>{
 mockStatus='error';await show();
 await waitFor(()=>expect(screen.getByRole('button',{name:'Review Gmail connection'})).toBeTruthy());
});
test('request refresh still runs when Gmail sync cannot be queued',async()=>{
 const {api}=require('../src/auth/context');api.post.mockRejectedValueOnce(new Error('Sync queue unavailable'));
 await show();
 await waitFor(()=>expect(screen.getByText(/Last synced/)).toBeTruthy());
 mockRefetch.mockClear();
 await fireEvent.press(screen.getByRole('button',{name:'Sync mailbox'}));
 expect(mockRefetch).toHaveBeenCalled();
});

test('queued sync feedback changes only after a new successful sync with an empty processing queue',async()=>{
 const {api}=require('../src/auth/context');
 api.post.mockImplementationOnce(async()=>{mockSynced='2026-10-25T10:00:00Z';return {status:'queued'};});
 await show();await waitFor(()=>expect(screen.getByText(/Last synced/)).toBeTruthy());
 await fireEvent.press(screen.getByRole('button',{name:'Sync mailbox'}));
 await waitFor(()=>expect(screen.getByText('Gmail and request processing are up to date.')).toBeTruthy());
});

test('done tab preserves search and equipment filters',async()=>{
 await show();
 await fireEvent.changeText(screen.getByLabelText('Search requests'),'Convocation');
 await fireEvent.press(screen.getByRole('button',{name:'Filter requests'}));
 await fireEvent.press(screen.getByRole('radio',{name:'Audio'}));
 await fireEvent.press(screen.getByRole('tab',{name:'Done requests'}));
 expect(mockPath).toContain('tab=completed');
 expect(mockPath).toContain('q=Convocation');
 expect(mockPath).toContain('department=audio');
});
