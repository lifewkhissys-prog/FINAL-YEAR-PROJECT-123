import { useEffect, useState } from 'react';
import { differenceInSeconds, parseISO } from 'date-fns';
import { Clock } from 'lucide-react';

export function CountdownTimer({ endsAt, onExpired }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!endsAt) return;

    const end = parseISO(endsAt);
    
    const calculateTimeLeft = () => {
      const now = new Date();
      const diff = differenceInSeconds(end, now);
      
      if (diff <= 0) {
        setTimeLeft(0);
        if (!isExpired) {
          setIsExpired(true);
          if (onExpired) onExpired();
        }
        return 0;
      }
      setTimeLeft(diff);
      return diff;
    };

    // Initial calculation
    const initialDiff = calculateTimeLeft();
    if (initialDiff <= 0) return;

    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [endsAt, onExpired, isExpired]);

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const isWarning = timeLeft > 0 && timeLeft <= 300; // 5 minutes warning
  const isCritical = timeLeft > 0 && timeLeft <= 60; // 1 minute critical

  let colorClass = 'text-[var(--text-primary)] bg-dark-800 border-default';
  if (isExpired) colorClass = 'text-red-400 bg-red-500/10 border-red-500/30';
  else if (isCritical) colorClass = 'text-red-400 bg-red-500/20 border-red-500/50 animate-pulse';
  else if (isWarning) colorClass = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-mono font-bold text-lg shadow-glass transition-colors ${colorClass}`}>
      <Clock size={20} className={isWarning || isCritical ? 'animate-pulse' : ''} />
      {formatTime(timeLeft)}
    </div>
  );
}
