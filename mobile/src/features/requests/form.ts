import {DateTime} from 'luxon';
export function parseLocalDate(date:string,time:string,zone:string){if(!date.trim()&&!time.trim())return null;if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time))throw new Error('Use YYYY-MM-DD for dates and HH:MM for times.');const d=DateTime.fromISO(date+'T'+time,{zone});if(!d.isValid)throw new Error('Enter a valid date and time.');return d.toISO()}
export function localParts(value:string|null,zone:string){const date=value?DateTime.fromISO(value).setZone(zone):null;return {date:date?.toFormat('yyyy-MM-dd')||'',time:date?.toFormat('HH:mm')||''}}
