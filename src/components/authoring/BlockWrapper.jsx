import { motion, useDragControls } from 'framer-motion';
import { GripVertical, Trash2 } from 'lucide-react';

export function BlockWrapper({ children, title, onRemove, id }) {
  const controls = useDragControls();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass group relative mb-6"
    >
      <div className="flex items-center justify-between p-3 border-b border-default bg-white/5">
        <div className="flex items-center gap-3">
          <div
            className="cursor-grab active:cursor-grabbing p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            onPointerDown={(e) => controls.start(e)}
          >
            <GripVertical size={18} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
            {title}
          </span>
        </div>
        
        <button
          onClick={onRemove}
          className="p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 rounded-md transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={16} />
        </button>
      </div>
      
      <div className="p-5">
        {children}
      </div>
    </motion.div>
  );
}
