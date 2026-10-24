export type Department = 'AUDIO' | 'VIDEO' | 'LOGISTICS';

export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

export type CueStatus = 'PENDING' | 'PREPPED' | 'TESTED' | 'LIVE';

export type CrewFilter = 'ALL' | 'AUDIO' | 'VIDEO' | 'MINE';

export interface CueItem {
  id: string;
  eventId: string;
  time: string;           // e.g. "08:00"
  title: string;          // e.g. "4x Wireless Handheld Mics"
  department: Department;
  specs: string;          // e.g. "Shure QLXD - Frequencies 614-616MHz"
  quantity: number;
  status: CueStatus;
  priority: Priority;
  isUrgent: boolean;
  assignedTo?: string;    // e.g. "Marcus (Audio Lead)"
  checkedBy?: string;     // e.g. "Marcus"
  sourceType: 'EMAIL' | 'MANUAL';
  sourceEmailId?: string;
}

export interface ProductionEvent {
  id: string;
  name: string;
  date: string;
  venue: string;
  setupDeadline: string;  // ISO timestamp for monotonic countdown
  eventStartTime: string;
  eventEndTime: string;
  organizer: string;
  contactPhone: string;
  status: 'CONFIRMED' | 'PENDING' | 'SCHEDULE_CHANGED';
}

export interface IngestedEmail {
  id: string;
  sender: string;
  subject: string;
  receivedAt: string;
  bodySnippet: string;
  summary: string;
  confidenceScore: number;
  hasAttachment: boolean;
  attachmentName?: string;
  linkedEventId: string;
}
