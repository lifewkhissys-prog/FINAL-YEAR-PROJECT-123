import { Link } from 'react-router-dom';
import { ArrowLeft, Eye } from 'lucide-react';
import { CountdownTimer } from '../assessment/CountdownTimer';

export function AttemptHeader({
  title,
  language,
  isAssessment,
  endsAt,
  onExpired,
  backUrl,
  onToggleFocusMode
}) {
  return (
    <header className="h-16 border-b border-default bg-[var(--bg-primary)]/80 backdrop-blur-xl sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-4 min-w-0">
        <Link
          to={backUrl || '/student/dashboard'}
          className="btn-secondary flex items-center gap-2 text-xs py-1.5 px-3 uppercase tracking-wider font-semibold transition-colors"
          title="Exit current attempt and return"
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">Exit Attempt</span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {isAssessment && endsAt && (
          <div className="scale-90 sm:scale-100">
            <CountdownTimer endsAt={endsAt} onExpired={onExpired} />
          </div>
        )}

        <button
          onClick={onToggleFocusMode}
          className="btn-secondary py-1.5 px-3 flex items-center gap-2 text-xs uppercase tracking-wider font-semibold"
          title="Toggle immersive Focus Mode (Question + Editor only)"
        >
          <Eye size={14} />
          <span>Focus Mode</span>
        </button>
      </div>
    </header>
  );
}
