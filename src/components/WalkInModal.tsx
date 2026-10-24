import React, { useState } from 'react';
import { Mic, X, Plus } from 'lucide-react';
import { CueItem, Department, Priority } from '../types/cue';

interface WalkInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCue: (newCue: Omit<CueItem, 'id' | 'eventId'>) => void;
}

export const WalkInModal: React.FC<WalkInModalProps> = ({
  isOpen,
  onClose,
  onAddCue,
}) => {
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState<Department>('AUDIO');
  const [time, setTime] = useState('09:30');
  const [specs, setSpecs] = useState('');
  const [priority, setPriority] = useState<Priority>('HIGH');
  const [isListening, setIsListening] = useState(false);

  if (!isOpen) return null;

  // Preset chips for rapid stage entry
  const presets = [
    { label: '+ 2x Wireless Mics', title: '2x Wireless Handheld Microphones', dept: 'AUDIO' as Department, specs: 'Shure QLXD with fresh AA batteries' },
    { label: '+ Podium Mic', title: 'Podium Gooseneck Microphone', dept: 'AUDIO' as Department, specs: 'Lectern mount with isolation transformer' },
    { label: '+ 4K Projector', title: 'Center Stage Projector', dept: 'VIDEO' as Department, specs: 'Laser 1080p/4K with HDMI feed from presenter' },
    { label: '+ Stage Monitor', title: 'Foldback Floor Monitor', dept: 'AUDIO' as Department, specs: 'Active 12-inch wedge on Aux 1' },
    { label: '+ Video Camera', title: 'Archival Video Camera', dept: 'VIDEO' as Department, specs: 'Tripod mount with clean SDI output' },
  ];

  const handleApplyPreset = (p: typeof presets[0]) => {
    setTitle(p.title);
    setDepartment(p.dept);
    setSpecs(p.specs);
  };

  const handleVoiceDictate = () => {
    // Check for browser speech recognition
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
                              (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Fallback simulated dictation
      setIsListening(true);
      setTimeout(() => {
        setTitle('Dean Emergency Remarks - 2 Cordless Mics');
        setDepartment('AUDIO');
        setSpecs('Requested verbally by Dean at stage wing for 10:15 AM start');
        setTime('10:00');
        setPriority('HIGH');
        setIsListening(false);
      }, 1200);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      setIsListening(true);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSpecs((prev) => (prev ? `${prev} | ${transcript}` : transcript));
        if (!title) setTitle(transcript.slice(0, 40));
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddCue({
      time,
      title: title.trim(),
      department,
      specs: specs.trim() || 'Verbal request logged on stage',
      quantity: 1,
      status: 'PENDING',
      priority,
      isUrgent: priority === 'HIGH',
      assignedTo: 'Marcus (Audio Lead)',
      sourceType: 'MANUAL',
    });

    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="walk-in-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 100,
        padding: '0',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: 'var(--bg-ground)',
          borderTop: '2px solid var(--accent-gaffer)',
          borderLeft: '1px solid var(--border-grid)',
          borderRight: '1px solid var(--border-grid)',
          borderRadius: '12px 12px 0 0',
          padding: '20px 16px',
          maxHeight: '90vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2
              id="walk-in-title"
              style={{
                fontSize: '16px',
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              LOG WALK-IN REQUEST
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Emergency hallway or verbal phone request
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              padding: '8px',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Voice Dictation Trigger */}
        <div
          onClick={handleVoiceDictate}
          style={{
            padding: '12px 14px',
            backgroundColor: isListening ? 'rgba(244, 224, 77, 0.15)' : 'var(--bg-surface)',
            border: isListening ? '1px solid var(--accent-gaffer)' : '1px solid var(--border-subtle)',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: isListening ? 'var(--accent-gaffer)' : 'var(--border-grid)',
                color: isListening ? 'var(--text-inverse)' : 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Mic size={16} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {isListening ? 'Listening on microphone...' : 'Tap to Speak Request'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {isListening ? 'Speak event name, gear, and time' : 'Auto-extracts gear, time, and specs'}
              </div>
            </div>
          </div>
          {isListening && (
            <span className="font-mono" style={{ fontSize: '11px', color: 'var(--accent-gaffer)', fontWeight: 700 }}>
              REC
            </span>
          )}
        </div>

        {/* Quick Presets */}
        <div>
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>
            Quick Equipment Chips
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handleApplyPreset(p)}
                style={{
                  padding: '6px 10px',
                  backgroundColor: 'var(--bg-row-alt)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '3px',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-primary)',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Manual Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label htmlFor="cue-title" style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Equipment / Cue Title *
            </label>
            <input
              id="cue-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 2x Wireless Handheld Mics"
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-grid)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label htmlFor="cue-dept" style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Department
              </label>
              <select
                id="cue-dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value as Department)}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-grid)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <option value="AUDIO">AUDIO</option>
                <option value="VIDEO">VIDEO</option>
                <option value="LOGISTICS">LOGISTICS</option>
              </select>
            </div>

            <div>
              <label htmlFor="cue-time" style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Required Time
              </label>
              <input
                id="cue-time"
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="09:30"
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-grid)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'var(--font-mono)',
                }}
              />
            </div>
          </div>

          <div>
            <label htmlFor="cue-specs" style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Specifications / Location Notes
            </label>
            <input
              id="cue-specs"
              type="text"
              value={specs}
              onChange={(e) => setSpecs(e.target.value)}
              placeholder="e.g. Stage Left, XLR line into mixer channel 5"
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-grid)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div>
            <label htmlFor="cue-priority" style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Priority Urgency
            </label>
            <select
              id="cue-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-grid)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <option value="HIGH">HIGH (Urgent Alert)</option>
              <option value="MEDIUM">MEDIUM (Standard)</option>
              <option value="LOW">LOW (Advance Prep)</option>
            </select>
          </div>

          <button
            type="submit"
            style={{
              marginTop: '8px',
              padding: '14px',
              backgroundColor: 'var(--accent-gaffer)',
              color: 'var(--text-inverse)',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Plus size={16} strokeWidth={3} />
            <span>COMMIT TO RUN-OF-SHOW</span>
          </button>
        </form>
      </div>
    </div>
  );
};
