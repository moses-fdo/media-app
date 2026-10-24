import React from 'react';
import { X, CheckCircle2, Clock, User, Tag } from 'lucide-react';
import { CueItem } from '../types/cue';

interface CueDetailModalProps {
  cue: CueItem | null;
  onClose: () => void;
  onToggleStatus: (cueId: string) => void;
}

export const CueDetailModal: React.FC<CueDetailModalProps> = ({
  cue,
  onClose,
  onToggleStatus,
}) => {
  if (!cue) return null;

  const isChecked = cue.status === 'TESTED' || cue.status === 'PREPPED';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cue-detail-title"
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
          gap: '14px',
        }}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={`dept-badge ${cue.department.toLowerCase()}`}>
              {cue.department}
            </span>
            <span className="font-mono" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              CUE @ {cue.time}
            </span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close modal">
            <X size={18} color="var(--text-muted)" />
          </button>
        </div>

        {/* Title */}
        <h2 id="cue-detail-title" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {cue.title}
        </h2>

        {/* Technical Specs Card */}
        <div
          style={{
            padding: '12px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '4px',
            fontSize: '13px',
            color: 'var(--text-primary)',
            lineHeight: 1.45,
          }}
        >
          {cue.specs}
        </div>

        {/* Metadata Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
            <Clock size={14} />
            <span>Scheduled Milestone Time: <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{cue.time}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
            <User size={14} />
            <span>Assigned Technician: <strong style={{ color: 'var(--text-primary)' }}>{cue.assignedTo || 'Unassigned'}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
            <Tag size={14} />
            <span>Source: <strong style={{ color: 'var(--text-primary)' }}>{cue.sourceType === 'EMAIL' ? 'Ingested from Email' : 'Stage Walk-in / Verbal'}</strong></span>
          </div>
        </div>

        {/* Status Verification Action */}
        <button
          type="button"
          onClick={() => {
            onToggleStatus(cue.id);
            onClose();
          }}
          style={{
            marginTop: '8px',
            padding: '12px',
            borderRadius: '4px',
            backgroundColor: isChecked ? 'var(--bg-row-alt)' : 'var(--accent-tested)',
            color: isChecked ? 'var(--text-primary)' : '#FFFFFF',
            border: isChecked ? '1px solid var(--border-subtle)' : 'none',
            fontWeight: 700,
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{isChecked ? 'MARK AS PENDING (UNVERIFY)' : 'MARK VERIFIED & SOUNDCHECKED'}</span>
        </button>
      </div>
    </div>
  );
};
