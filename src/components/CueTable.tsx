import React from 'react';
import { CueItem } from '../types/cue';
import { CueRow } from './CueRow';

interface CueTableProps {
  cues: CueItem[];
  onToggleStatus: (cueId: string) => void;
  onSelectCue: (cue: CueItem) => void;
}

export const CueTable: React.FC<CueTableProps> = ({
  cues,
  onToggleStatus,
  onSelectCue,
}) => {
  if (cues.length === 0) {
    return (
      <div
        style={{
          padding: '48px 16px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
          No cues match the selected filter.
        </p>
        <p style={{ fontSize: '13px' }}>
          Switch filter tabs above or log a new walk-in request.
        </p>
      </div>
    );
  }

  return (
    <div
      role="table"
      aria-label="Master Cue Sheet Run-of-Show"
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Table Column Headers */}
      <div
        role="row"
        style={{
          display: 'grid',
          gridTemplateColumns: 'var(--time-col-width) 1fr var(--status-col-width)',
          padding: '10px 14px',
          borderBottom: '1px solid var(--border-grid)',
          backgroundColor: 'var(--bg-surface)',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          color: 'var(--text-dim)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        <div role="columnheader">TIME</div>
        <div role="columnheader">TECHNICAL CUE & ROUTING</div>
        <div role="columnheader" style={{ textAlign: 'center' }}>VERIFY</div>
      </div>

      {/* Cue Rows */}
      {cues.map((cue, index) => (
        <CueRow
          key={cue.id}
          cue={cue}
          isEven={index % 2 === 1}
          onToggleStatus={onToggleStatus}
          onSelectCue={onSelectCue}
        />
      ))}
    </div>
  );
};
