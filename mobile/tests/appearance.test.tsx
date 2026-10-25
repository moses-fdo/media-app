import { Pressable, Text } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from '../src/theme';
function Appearance() { const {mode,setMode}=useTheme(); return <><Text>{mode}</Text><Pressable accessibilityRole="button" accessibilityLabel="Use dark" onPress={()=>setMode('dark')}/></>; }
beforeEach(async()=>{ await AsyncStorage.clear(); });
test('appearance follows the system initially and restores the saved choice after restart',async()=>{
 const view=await render(<ThemeProvider><Appearance/></ThemeProvider>);
 expect(screen.getByText('system')).toBeTruthy();
 await fireEvent.press(screen.getByRole('button',{name:'Use dark'}));
 await waitFor(()=>expect(screen.getByText('dark')).toBeTruthy());
 await view.unmount();
 await render(<ThemeProvider><Appearance/></ThemeProvider>);
 await waitFor(()=>expect(screen.getByText('dark')).toBeTruthy());
});
