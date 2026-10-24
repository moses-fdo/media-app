import React from 'react';

interface GafferTapeStampProps {
  label: string;
  isUrgent?: boolean;
}

export const GafferTapeStamp: React.FC<GafferTapeStampProps> = ({ label, isUrgent = false }) => {
  return (
    <span
      className={`gaffer-stamp ${isUrgent ? 'urgent' : ''}`}
      role="status"
      aria-label={`Urgency: ${label}`}
    >
      <span aria-hidden="true">[!]</span>
      <span>{label}</span>
    </span>
  );
};
