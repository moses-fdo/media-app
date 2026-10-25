import {render,screen,fireEvent} from '@testing-library/react-native';
import {DateField,pickerDate} from '../src/components/DateField';
import {ThemeProvider} from '../src/theme';
jest.mock('@expo/ui/community/datetime-picker',()=>({__esModule:true,default:({onChange}:any)=>{
 const {Pressable}=require('react-native');return <Pressable accessibilityRole="button" accessibilityLabel="Choose native date" onPress={()=>onChange({type:'set'},new Date(2030,11,25,17,45))}/>;
}}));
test('picker components preserve the selected wall-clock date and time for workspace conversion',async()=>{
 const date=jest.fn();await render(<ThemeProvider><DateField label="Event date" mode="date" value="" timezone="Asia/Kolkata" onChange={date}/></ThemeProvider>);
 await fireEvent.press(screen.getByRole('button',{name:'Event date'}));
 await fireEvent.press(screen.getByRole('button',{name:'Choose native date'}));
 expect(date).toHaveBeenCalledWith('2030-12-25');
 expect(pickerDate('17:45','time','Asia/Kolkata').getHours()).toBe(17);
 expect(pickerDate('2030-12-25','date','Asia/Kolkata').getDate()).toBe(25);
});
