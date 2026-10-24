import React from 'react';
import { X, Calendar, Check, Download } from 'lucide-react';
import { ProductionEvent } from '../types/cue';
import { downloadICS } from '../utils/icsGenerator';

interface CalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: ProductionEvent;
}

export const CalendarSyncModal: React.FC<CalendarSyncModalProps> = ({
  isOpen,
  onClose,
  event,
}) => {
  if (!isOpen) return null;

  const handleDownload = () => {
    downloadICS(event);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'var(--bg-ground)',
          border: '1px solid var(--border-grid)',
          borderRadius: '8px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="var(--accent-gaffer)" />
            <h2 id="calendar-modal-title" style={{ fontSize: '15px', fontWeight: 800 }}>
              DEVICE CALENDAR SYNC
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close modal">
            <X size={18} color="var(--text-muted)" />
          </button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          Sync this setup deadline directly with Apple Calendar, Google Calendar, or Microsoft Outlook. Includes 1-hour and 15-minute soundcheck alarms.
        </p>

        <div
          style={{
            padding: '12px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '4px',
            fontSize: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{event.name}</div>
          <div style={{ color: 'var(--text-muted)' }}>📍 {event.venue}</div>
          <div className="font-mono" style={{ color: 'var(--accent-gaffer)' }}>
            ⏰ Setup Deadline: {event.setupDeadline.slice(11, 16)} (Oct 25)
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            onClick={handleDownload}
            style={{
              padding: '12px',
              backgroundColor: 'var(--text-primary)',
              color: 'var(--text-inverse)',
              borderRadius: '4px',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Download size={16} />
            <span>DOWNLOAD .ICS FILE</span>
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '11px',
              color: 'var(--accent-tested)',
            }}
          >
            <Check size={12} />
            <span>Includes 1h & 15m native alarm triggers</span>
          </div>
        </div>
      </div>
    </div>
  );
};
