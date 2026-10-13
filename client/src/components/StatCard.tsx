import { type LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { Card } from './ui/Card';

interface Props {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: 'accent' | 'success' | 'warning';
  hint?: string;
}

const toneClasses = {
  accent: 'bg-accent/10 text-accent',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
};

export function StatCard({ label, value, icon: Icon, tone = 'accent', hint }: Props) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-text-muted">{label}</span>
        <div className={clsx('flex items-center justify-center w-7 h-7 rounded-md', toneClasses[tone])}>
          <Icon size={14} />
        </div>
      </div>
      <div className="text-xl font-semibold text-text tnum font-mono">{value}</div>
      {hint && <div className="text-[11px] text-text-faint mt-1">{hint}</div>}
    </Card>
  );
}
