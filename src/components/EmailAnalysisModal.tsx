import React, { useState } from 'react';
import { X, Mail, FileText, CheckCircle2 } from 'lucide-react';
import { IngestedEmail } from '../types/cue';

interface EmailAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  emails: IngestedEmail[];
}

export const EmailAnalysisModal: React.FC<EmailAnalysisModalProps> = ({
  isOpen,
  onClose,
  emails,
}) => {
  const [selectedEmail, setSelectedEmail] = useState<IngestedEmail>(emails[0]);
  const [showRawBody, setShowRawBody] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-modal-title"
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
          maxWidth: '480px',
          maxHeight: '85vh',
          backgroundColor: 'var(--bg-ground)',
          border: '1px solid var(--border-grid)',
          borderRadius: '8px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mail size={18} color="var(--tag-audio)" />
            <h2 id="email-modal-title" style={{ fontSize: '15px', fontWeight: 800 }}>
              AI EMAIL ANALYSIS
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close modal">
            <X size={18} color="var(--text-muted)" />
          </button>
        </div>

        {/* Email selector pills */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          {emails.map((mail) => (
            <button
              key={mail.id}
              type="button"
              onClick={() => {
                setSelectedEmail(mail);
                setShowRawBody(false);
              }}
              style={{
                padding: '6px 10px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                borderRadius: '3px',
                backgroundColor: selectedEmail.id === mail.id ? 'var(--bg-row-hover)' : 'var(--bg-surface)',
                border: selectedEmail.id === mail.id ? '1px solid var(--accent-gaffer)' : '1px solid var(--border-grid)',
                color: selectedEmail.id === mail.id ? 'var(--text-primary)' : 'var(--text-muted)',
                whiteSpace: 'nowrap',
              }}
            >
              {mail.id === 'mail-01' ? 'Convocation (Today)' : 'Bioethics (Next Wk)'}
            </button>
          ))}
        </div>

        {/* Email Header Card */}
        <div
          style={{
            padding: '12px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontSize: '12px',
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>
            {selectedEmail.subject}
          </div>
          <div style={{ color: 'var(--text-muted)' }}>
            <strong>From:</strong> {selectedEmail.sender}
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
            Received: {selectedEmail.receivedAt}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--accent-tested)',
                fontWeight: 700,
              }}
            >
              <CheckCircle2 size={13} />
              <span>{Math.round(selectedEmail.confidenceScore * 100)}% EXTRACTION CONFIDENCE</span>
            </span>
          </div>
        </div>

        {/* Attachment Card if present */}
        {selectedEmail.hasAttachment && (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: 'var(--bg-row-alt)',
              border: '1px solid var(--border-grid)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} color="var(--accent-gaffer)" />
              <div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {selectedEmail.attachmentName}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                  Parsed via background PDF extractor
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--accent-tested)',
                border: '1px solid rgba(48, 164, 108, 0.4)',
                padding: '2px 6px',
                borderRadius: '2px',
              }}
            >
              ATTACHMENT PARSED
            </span>
          </div>
        )}

        {/* AI Summary vs Raw Toggle */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              {showRawBody ? 'RAW EMAIL BODY' : 'AI STRUCTURED SUMMARY'}
            </div>
            <button
              type="button"
              onClick={() => setShowRawBody(!showRawBody)}
              style={{
                fontSize: '11px',
                color: 'var(--accent-gaffer)',
                textDecoration: 'underline',
              }}
            >
              {showRawBody ? 'Show Structured Summary' : 'View Raw Email Snippet'}
            </button>
          </div>

          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-grid)',
              borderRadius: '4px',
              fontSize: '12px',
              lineHeight: 1.5,
              color: 'var(--text-primary)',
            }}
          >
            {showRawBody ? selectedEmail.bodySnippet : selectedEmail.summary}
          </div>
        </div>
      </div>
    </div>
  );
};
