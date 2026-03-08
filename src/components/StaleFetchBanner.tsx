import { isDaysMissed } from '@/lib/cronManager';
import { Button } from '@/components/ui/button';
import { useFetchPrices } from '@/hooks/usePrices';

export function StaleFetchBanner() {
  const missed = isDaysMissed();
  const fetchMutation = useFetchPrices();

  if (missed <= 1) return null;

  return (
    <div className="bg-warning/20 border border-warning rounded-lg p-3 text-sm flex items-center justify-between gap-2">
      <span>
        ⚠️ Prices may be outdated. App wasn't opened{missed > 2 ? ` for ${missed} days` : ' yesterday'}.
      </span>
      <Button
        size="sm"
        className="text-xs shrink-0"
        onClick={() => fetchMutation.mutate()}
        disabled={fetchMutation.isPending}
      >
        {fetchMutation.isPending ? 'Fetching...' : 'Fetch Now'}
      </Button>
    </div>
  );
}
