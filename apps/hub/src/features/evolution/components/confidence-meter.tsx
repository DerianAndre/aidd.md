interface ConfidenceMeterProps {
  value: number;
}

export function ConfidenceMeter({ value }: ConfidenceMeterProps) {
  const color =
    value >= 80
      ? 'bg-success'
      : value >= 50
        ? 'bg-warning'
        : 'bg-danger';

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-default-200">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-[10px] font-medium text-default-500">{value}%</span>
    </div>
  );
}
