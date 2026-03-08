import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CROPS, MANDIS } from '@/lib/farmConfig';

export interface PriceRecord {
  id: string;
  price_date: string;
  commodity: string;
  mandi: string;
  min_price: number | null;
  max_price: number | null;
  modal_price: number;
  fetched_at: string;
}

export function usePrices() {
  return useQuery({
    queryKey: ['prices', 'latest'],
    queryFn: async (): Promise<PriceRecord[]> => {
      const { data, error } = await supabase
        .from('daily_prices')
        .select('*')
        .order('price_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data ?? []) as PriceRecord[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePriceHistory(days: number = 90) {
  return useQuery({
    queryKey: ['prices', 'history', days],
    queryFn: async (): Promise<PriceRecord[]> => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from('daily_prices')
        .select('*')
        .gte('price_date', since.toISOString().split('T')[0])
        .order('price_date', { ascending: true });

      if (error) throw error;
      return (data ?? []) as PriceRecord[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useFetchPrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-all-prices', {
        method: 'POST',
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prices'] });
    },
  });
}

export function getLatestPrice(prices: PriceRecord[], commodity: string, mandi: string): PriceRecord | undefined {
  return prices.find(p => p.commodity === commodity && p.mandi === mandi);
}

export function getAvgPrice(prices: PriceRecord[], commodity: string, days: number): number | null {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const filtered = prices.filter(p =>
    p.commodity === commodity && new Date(p.price_date) >= since
  );
  if (filtered.length === 0) return null;
  return filtered.reduce((sum, p) => sum + p.modal_price, 0) / filtered.length;
}
