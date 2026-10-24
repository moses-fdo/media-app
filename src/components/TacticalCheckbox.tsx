import React from 'react';
import { Check } from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics';

interface TacticalCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
}

export const TacticalCheckbox: React.FC<TacticalCheckboxProps> = ({ checked, onChange, ariaLabel }) => {
  const { triggerHaptic } = useHaptics();

  const handleToggle = () => {
    triggerHaptic();
    onChange(!checked);
  };

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={handleToggle}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '44px',
        height: '44px',
        minWidth: '44px',
        minHeight: '44px',
        padding: '0',
        cursor: 'pointer',
        background: 'transparent',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '22px',
          height: '22px',
          borderRadius: '3px',
          border: checked ? '1.5px solid var(--accent-tested)' : '1.5px solid var(--border-subtle)',
          backgroundColor: checked ? 'var(--accent-tested)' : 'var(--bg-surface)',
          color: '#FFFFFF',
          transition: 'all 0.1s ease',
        }}
      >
        {checked && <Check size={14} strokeWidth={3} />}
      </span>
    </button>
  );
};
