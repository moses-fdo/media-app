import { useState, useMemo, useEffect } from 'react';
import { initialCues, mockCurrentEvent, mockEmails } from './data/initialCues';
import { CueItem, CrewFilter } from './types/cue';
import { useCountdown } from './hooks/useCountdown';
import { Header } from './components/Header';
import { DepartmentFilter } from './components/DepartmentFilter';
import { CueTable } from './components/CueTable';
import { WalkInModal } from './components/WalkInModal';
import { EmailAnalysisModal } from './components/EmailAnalysisModal';
import { CalendarSyncModal } from './components/CalendarSyncModal';
import { CueDetailModal } from './components/CueDetailModal';
import { Plus, CheckSquare } from 'lucide-react';

export function App() {
  const [event] = useState(mockCurrentEvent);
  const [cues, setCues] = useState<CueItem[]>(() => {
    const saved = localStorage.getItem('master_cues_state');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return initialCues;
      }
    }
    return initialCues;
  });

  const [filter, setFilter] = useState<CrewFilter>('ALL');
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [isEmailsOpen, setIsEmailsOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedCue, setSelectedCue] = useState<CueItem | null>(null);

  // Synchronize state changes to localStorage
  useEffect(() => {
    localStorage.setItem('master_cues_state', JSON.stringify(cues));
  }, [cues]);

  // Zero-jitter monotonic countdown
  const countdown = useCountdown(event.setupDeadline);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }
      if (e.key === 'w' || e.key === 'W') {
        setIsWalkInOpen((prev) => !prev);
      } else if (e.key === '1') {
        setFilter('ALL');
      } else if (e.key === '2') {
        setFilter('AUDIO');
      } else if (e.key === '3') {
        setFilter('VIDEO');
      } else if (e.key === '4') {
        setFilter('MINE');
      } else if (e.key === 'Escape') {
        setIsWalkInOpen(false);
        setIsEmailsOpen(false);
        setIsCalendarOpen(false);
        setSelectedCue(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered cues computation
  const filteredCues = useMemo(() => {
    return cues.filter((cue) => {
      if (filter === 'AUDIO') return cue.department === 'AUDIO';
      if (filter === 'VIDEO') return cue.department === 'VIDEO';
      if (filter === 'MINE') return cue.assignedTo?.toLowerCase().includes('marcus');
      return true;
    });
  }, [cues, filter]);

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: cues.length,
      audio: cues.filter((c) => c.department === 'AUDIO').length,
      video: cues.filter((c) => c.department === 'VIDEO').length,
      mine: cues.filter((c) => c.assignedTo?.toLowerCase().includes('marcus')).length,
    };
  }, [cues]);

  // Completed metrics
  const verifiedCount = useMemo(() => {
    return cues.filter((c) => c.status === 'TESTED' || c.status === 'PREPPED').length;
  }, [cues]);

  // Toggle cue status
  const handleToggleStatus = (cueId: string) => {
    setCues((prevCues) =>
      prevCues.map((cue) => {
        if (cue.id === cueId) {
          const isCurrentlyVerified = cue.status === 'TESTED' || cue.status === 'PREPPED';
          return {
            ...cue,
            status: isCurrentlyVerified ? 'PENDING' : 'TESTED',
            checkedBy: isCurrentlyVerified ? undefined : 'Marcus',
          };
        }
        return cue;
      })
    );
  };

  // Add new walk-in cue
  const handleAddCue = (newCueData: Omit<CueItem, 'id' | 'eventId'>) => {
    const newCue: CueItem = {
      ...newCueData,
      id: `cue-${Date.now()}`,
      eventId: event.id,
    };
    setCues((prev) => [newCue, ...prev]);
  };

  return (
    <div className="app-container">
      {/* Pinned Broadcast Header */}
      <Header
        event={event}
        countdown={countdown}
        onOpenEmails={() => setIsEmailsOpen(true)}
        onOpenCalendar={() => setIsCalendarOpen(true)}
      />

      {/* Department Tabs */}
      <DepartmentFilter
        currentFilter={filter}
        onFilterChange={setFilter}
        counts={counts}
      />

      {/* Main Run-of-Show Cue Sheet */}
      <main style={{ flex: 1, paddingBottom: '90px' }}>
        <CueTable
          cues={filteredCues}
          onToggleStatus={handleToggleStatus}
          onSelectCue={setSelectedCue}
        />
      </main>

      {/* Bottom Telemetry & Status Bar */}
      <footer
        style={{
          position: 'sticky',
          bottom: 0,
          backgroundColor: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-grid)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckSquare size={16} color="var(--accent-tested)" />
          <span
            className="font-mono"
            style={{ fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}
          >
            {verifiedCount} / {cues.length} VERIFIED
          </span>
        </div>

        {/* Floating Walk-in Action Trigger */}
        <button
          type="button"
          onClick={() => setIsWalkInOpen(true)}
          title="Log Manual Stage Walk-In Request (Hot key: W)"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--text-primary)',
            color: 'var(--text-inverse)',
            padding: '8px 16px',
            borderRadius: '24px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '0.05em',
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            minHeight: '44px',
          }}
        >
          <Plus size={15} strokeWidth={3} />
          <span>+ WALK-IN</span>
        </button>
      </footer>

      {/* Modals */}
      <WalkInModal
        isOpen={isWalkInOpen}
        onClose={() => setIsWalkInOpen(false)}
        onAddCue={handleAddCue}
      />

      <EmailAnalysisModal
        isOpen={isEmailsOpen}
        onClose={() => setIsEmailsOpen(false)}
        emails={mockEmails}
      />

      <CalendarSyncModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        event={event}
      />

      <CueDetailModal
        cue={selectedCue}
        onClose={() => setSelectedCue(null)}
        onToggleStatus={handleToggleStatus}
      />
    </div>
  );
}
export default App;
