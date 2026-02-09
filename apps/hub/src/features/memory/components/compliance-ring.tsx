import { cn } from '@/lib/utils';

interface ComplianceRingProps {
  score: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeConfig = {
  sm: { width: 32, stroke: 2, fontSize: 'text-[10px]' },
  md: { width: 48, stroke: 3, fontSize: 'text-xs' },
  lg: { width: 64, stroke: 4, fontSize: 'text-sm' },
};

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-teal-500';
  if (score >= 40) return 'text-yellow-500';
  return 'text-red-500';
}

export function ComplianceRing({ score, size = 'md', className }: ComplianceRingProps) {
  const config = sizeConfig[size];
  const radius = (config.width - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const colorClass = getScoreColor(score);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: config.width, height: config.width }}>
      <svg
        width={config.width}
        height={config.width}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={config.width / 2}
          cy={config.width / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.stroke}
          className="text-border opacity-20"
        />
        {/* Progress circle */}
        <circle
          cx={config.width / 2}
          cy={config.width / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(colorClass, 'transition-all duration-300')}
        />
      </svg>
      {/* Score text */}
      <span className={cn('absolute font-mono font-semibold', config.fontSize, colorClass)}>
        {score}
      </span>
    </div>
  );
}
