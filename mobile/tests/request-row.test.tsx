import React from 'react';
import {render,screen,fireEvent} from '@testing-library/react-native';
import {RequestRow} from '../src/features/requests/RequestRow';
import {ThemeProvider} from '../src/theme';
test('shows request summary and opens details when tapped',async ()=>{
 const open=jest.fn();
 await render(<ThemeProvider><RequestRow item={{id:'a',title:'Annual Convocation',organizer:'Registrar',venue:'Main Hall',event_start:null,setup_deadline:null,status:'needs_review',requirements_summary:'4 microphones',timezone:'Asia/Kolkata'} as any} onPress={open}/></ThemeProvider>);
 expect(screen.getByText('4 microphones')).toBeTruthy();expect(screen.getByText('Deadline to confirm')).toBeTruthy();
 fireEvent.press(screen.getByRole('button',{name:/Annual Convocation/}));expect(open).toHaveBeenCalledTimes(1);
});
