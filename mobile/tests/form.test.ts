import {parseLocalDate} from '../src/features/requests/form';
test('saves local event time with the workspace offset and rejects invalid dates',()=>{
 expect(parseLocalDate('2026-10-25','10:00','Asia/Kolkata')).toBe('2026-10-25T10:00:00.000+05:30');
 expect(()=>parseLocalDate('2026-02-31','10:00','Asia/Kolkata')).toThrow();
 expect(parseLocalDate('','','Asia/Kolkata')).toBe(null);
});
