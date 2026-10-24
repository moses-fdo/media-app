import { useState, useEffect } from 'react';

export interface CountdownResult {
  formatted: string;
  hours: number;
  minutes: number;
  seconds: number;
  isOverdue: boolean;
  isUrgent: boolean; // < 1 hour remaining
}

export function useCountdown(targetIsoDate: string): CountdownResult {
  const calculate = (): CountdownResult => {
    const target = new Date(targetIsoDate).getTime();
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      const overdueSec = Math.abs(Math.floor(diff / 1000));
      const h = Math.floor(overdueSec / 3600);
      const m = Math.floor((overdueSec % 3600) / 60);
      const s = overdueSec % 60;
      const pad = (n: number) => n.toString().padStart(2, '0');
      return {
        formatted: `+${pad(h)}:${pad(m)}:${pad(s)} OVERDUE`,
        hours: h,
        minutes: m,
        seconds: s,
        isOverdue: true,
        isUrgent: true,
      };
    }

    const totalSeconds = Math.floor(diff / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');

    return {
      formatted: `T-${pad(h)}:${pad(m)}:${pad(s)}`,
      hours: h,
      minutes: m,
      seconds: s,
      isOverdue: false,
      isUrgent: totalSeconds < 3600, // less than 60 mins
    };
  };

  const [time, setTime] = useState<CountdownResult>(calculate);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(calculate());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetIsoDate]);

  return time;
}
