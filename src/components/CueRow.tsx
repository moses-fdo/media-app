import React from 'react';
import { CueItem } from '../types/cue';
import { TacticalCheckbox } from './TacticalCheckbox';
import { GafferTapeStamp } from './GafferTapeStamp';

interface CueRowProps {
  cue: CueItem;
  isEven: boolean;
  onToggleStatus: (cueId: string) => void;
  onSelectCue: (cue: CueItem) => void;
}

export const CueRow: React.FC<CueRowProps> = ({
  cue,
  isEven,
  onToggleStatus,
  onSelectCue,
}) => {
  const isChecked = cue.status === 'TESTED' || cue.status === 'PREPPED';

  return (
    <div
      role="row"
      style={{
        display: 'grid',
        gridTemplateColumns: 'var(--time-col-width) 1fr var(--status-col-width)',
        alignItems: 'center',
        minHeight: '68px',
        borderBottom: '1px solid var(--border-grid)',
        backgroundColor: isEven ? 'var(--bg-row-alt)' : 'var(--bg-ground)',
        transition: 'background-color 0.1s ease',
      }}
    >
      {/* Column 1: Monospaced Timecode */}
      <div
        className="font-mono"
        style={{
          padding: '12px 8px 12px 14px',
          fontSize: '15px',
          fontWeight: 700,
          color: isChecked ? 'var(--text-muted)' : 'var(--text-primary)',
          letterSpacing: '-0.02em',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
        }}
      >
        <span>{cue.time}</span>
        {cue.sourceType === 'MANUAL' && (
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent-gaffer)',
              letterSpacing: '0.04em',
              fontWeight: 700,
            }}
          >
            WALK-IN
          </span>
        )}
      </div>

      {/* Column 2: Cue Specifications & Metadata */}
      <div
        onClick={() => onSelectCue(cue)}
        style={{
          padding: '12px 8px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
        }}
      >
        {/* Department Tag & Urgency Stamp */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
          <span className={`dept-badge ${cue.department.toLowerCase()}`}>
            {cue.department}
          </span>

          {cue.isUrgent && (
            <GafferTapeStamp label="URGENT SETUP" isUrgent={true} />
          )}

          {cue.priority === 'HIGH' && !cue.isUrgent && (
            <GafferTapeStamp label="HIGH PRIORITY" />
          )}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: isChecked ? 'var(--text-muted)' : 'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          {cue.title}
        </div>

        {/* Technical Specs & Routing Detail */}
        <div
          style={{
            fontSize: '13px',
            color: isChecked ? 'var(--text-dim)' : 'var(--text-muted)',
            lineHeight: 1.4,
          }}
        >
          {cue.specs}
        </div>

        {/* Assignment & Tested By */}
        {cue.assignedTo && (
          <div
            style={{
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              color: isChecked ? 'var(--accent-tested)' : 'var(--text-dim)',
              marginTop: '2px',
            }}
          >
            {isChecked && cue.checkedBy ? `[✓ TESTED BY ${cue.checkedBy.toUpperCase()}]` : `ASSIGNED: ${cue.assignedTo}`}
          </div>
        )}
      </div>

      {/* Column 3: Tactile Mechanical Checkbox */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingRight: '6px',
        }}
      >
        <TacticalCheckbox
          checked={isChecked}
          onChange={() => onToggleStatus(cue.id)}
          ariaLabel={`Toggle verification for ${cue.title}`}
        />
      </div>
    </div>
  );
};
