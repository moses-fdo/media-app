import React from 'react';
import { CrewFilter } from '../types/cue';

interface DepartmentFilterProps {
  currentFilter: CrewFilter;
  onFilterChange: (filter: CrewFilter) => void;
  counts: {
    all: number;
    audio: number;
    video: number;
    mine: number;
  };
}

export const DepartmentFilter: React.FC<DepartmentFilterProps> = ({
  currentFilter,
  onFilterChange,
  counts,
}) => {
  const tabs: Array<{ id: CrewFilter; label: string; count: number; color?: string }> = [
    { id: 'ALL', label: 'ALL', count: counts.all },
    { id: 'AUDIO', label: 'AUDIO', count: counts.audio, color: 'var(--tag-audio)' },
    { id: 'VIDEO', label: 'VIDEO', count: counts.video, color: 'var(--tag-video)' },
    { id: 'MINE', label: 'MY CUES', count: counts.mine, color: 'var(--accent-gaffer)' },
  ];

  return (
    <nav
      aria-label="Department Filters"
      style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-grid)',
        borderTop: '1px solid var(--border-grid)',
        backgroundColor: 'var(--bg-surface)',
        overflowX: 'auto',
      }}
    >
      {tabs.map((tab) => {
        const isActive = currentFilter === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onFilterChange(tab.id)}
            role="tab"
            aria-selected={isActive}
            style={{
              flex: 1,
              minWidth: '76px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 8px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: isActive ? 800 : 600,
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              backgroundColor: isActive ? 'var(--bg-row-hover)' : 'transparent',
              borderBottom: isActive ? '2px solid var(--accent-gaffer)' : '2px solid transparent',
              transition: 'background-color 0.1s ease',
            }}
          >
            <span>{tab.label}</span>
            <span
              style={{
                fontSize: '11px',
                padding: '1px 5px',
                borderRadius: '2px',
                backgroundColor: isActive ? 'var(--border-subtle)' : 'var(--border-grid)',
                color: tab.color || 'var(--text-primary)',
              }}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
