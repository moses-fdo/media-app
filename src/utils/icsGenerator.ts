import { ProductionEvent } from '../types/cue';

export function generateICS(event: ProductionEvent): string {
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const deadline = new Date(event.setupDeadline);
  const start = new Date(deadline.getTime() - 2 * 60 * 60 * 1000); // 2 hours before setup deadline
  const created = new Date();

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Smart Media Mail Assistant//Master Cue Sheet//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@mediaapp.institution.edu`,
    `DTSTAMP:${formatDate(created)}`,
    `DTSTART:${formatDate(start)}`,
    `DTEND:${formatDate(deadline)}`,
    `SUMMARY:[SETUP DEADLINE] ${event.name}`,
    `DESCRIPTION:Mandatory Media and Audio/Video Setup Deadline.\\nVenue: ${event.venue}\\nContact: ${event.contactPhone}\\nOpen Master Cue Sheet: mediaapp://events/${event.id}`,
    `LOCATION:${event.venue}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Media Setup Deadline in 1 Hour',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Final Soundcheck & Equipment Deadline in 15 Minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadICS(event: ProductionEvent) {
  const icsData = generateICS(event);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${event.id}_setup_deadline.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
