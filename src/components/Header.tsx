import React from 'react';
import { ProductionEvent } from '../types/cue';
import { CountdownResult } from '../hooks/useCountdown';
import { Calendar, Mail, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  event: ProductionEvent;
  countdown: CountdownResult;
  onOpenEmails: () => void;
  onOpenCalendar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  event,
  countdown,
  onOpenEmails,
  onOpenCalendar,
}) => {
  return (
    <header
      style={{
        borderBottom: '1px solid var(--border-grid)',
        backgroundColor: 'var(--bg-ground)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Top Telemetry Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-grid)',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: countdown.isOverdue
                ? 'var(--accent-urgent)'
                : countdown.isUrgent
                ? 'var(--accent-gaffer)'
                : 'var(--accent-tested)',
              display: 'inline-block',
            }}
          />
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-grotesk)',
            }}
          >
            MEDIA OPS // CUE SHEET
          </h1>
        </div>

        {/* Quick Utility Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={onOpenEmails}
            title="View Ingested AI Email Analysis"
            aria-label="View Ingested AI Email Analysis"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '8px 12px',
              borderRadius: '3px',
              backgroundColor: 'var(--bg-row-alt)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              minHeight: '36px',
            }}
          >
            <Mail size={13} />
            <span>EMAIL</span>
          </button>

          <button
            type="button"
            onClick={onOpenCalendar}
            title="Sync Setup Deadline to Device Calendar"
            aria-label="Sync Setup Deadline to Device Calendar"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '8px 12px',
              borderRadius: '3px',
              backgroundColor: 'var(--bg-row-alt)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              minHeight: '36px',
            }}
          >
            <Calendar size={13} />
            <span>CALENDAR</span>
          </button>
        </div>
      </div>

      {/* Primary Zero-Jitter Live Countdown Strip */}
      <div
        style={{
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
          }}
        >
          <div
            className="font-mono"
            style={{
              fontSize: '32px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: countdown.isOverdue
                ? 'var(--accent-urgent)'
                : countdown.isUrgent
                ? 'var(--accent-gaffer)'
                : 'var(--text-primary)',
            }}
          >
            {countdown.formatted}
          </div>

          <div
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            SETUP DUE: {event.setupDeadline.slice(11, 16)}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div>
            <h2
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              {event.name}
            </h2>
            <p
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                marginTop: '2px',
              }}
            >
              {event.venue} &bull; Starts {event.eventStartTime}
            </p>
          </div>

          {countdown.isUrgent && !countdown.isOverdue && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 8px',
                backgroundColor: 'rgba(244, 224, 77, 0.12)',
                border: '1px solid var(--accent-gaffer)',
                borderRadius: '2px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--accent-gaffer)',
                fontWeight: 700,
              }}
            >
              <AlertTriangle size={13} />
              <span>SOUNDCHECK DUE</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
