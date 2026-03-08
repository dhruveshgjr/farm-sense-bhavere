import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export function DataExportSection() {
  const [importing, setImporting] = useState(false);

  const exportPricesCsv = async () => {
    const { data } = await supabase.from('daily_prices').select('*').order('price_date', { ascending: false });
    if (!data?.length) { toast({ title: 'No data to export' }); return; }
    const csv = ['date,commodity,mandi,modal_price,min_price,max_price,arrivals_qtl,source',
      ...data.map(r => `${r.price_date},${r.commodity},${r.mandi},${r.modal_price},${r.min_price ?? ''},${r.max_price ?? ''},${r.arrivals_qtl ?? ''},${r.source ?? ''}`)
    ].join('\n');
    downloadBlob(new Blob([csv], { type: 'text/csv' }), `kisanmitra_prices_${todayStr()}.csv`);
  };

  const exportReportsCsv = async () => {
    const { data } = await supabase.from('report_history').select('*').order('generated_at', { ascending: false });
    if (!data?.length) { toast({ title: 'No reports to export' }); return; }
    const csv = ['id,generated_at,notes', ...data.map(r => `${r.id},${r.generated_at},${JSON.stringify(r.notes ?? '')}`)].join('\n');
    downloadBlob(new Blob([csv], { type: 'text/csv' }), `kisanmitra_reports_${todayStr()}.csv`);
  };

  const exportFullBackup = async () => {
    const [{ data: prices }, { data: reports }] = await Promise.all([
      supabase.from('daily_prices').select('*').order('price_date', { ascending: false }),
      supabase.from('report_history').select('*').order('generated_at', { ascending: false }),
    ]);
    const backup = { prices: prices ?? [], reports: reports ?? [] };
    downloadBlob(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }), `kisanmitra_backup_${todayStr()}.json`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      let imported = 0;
      if (backup.prices?.length) {
        for (let i = 0; i < backup.prices.length; i += 50) {
          const batch = backup.prices.slice(i, i + 50).map((r: any) => ({
            price_date: r.price_date,
            commodity: r.commodity,
            mandi: r.mandi,
            modal_price: r.modal_price,
            min_price: r.min_price,
            max_price: r.max_price,
            arrivals_qtl: r.arrivals_qtl,
            source: r.source ?? 'import',
          }));
          await supabase.from('daily_prices').upsert(batch, { onConflict: 'price_date,commodity,mandi' });
          imported += batch.length;
        }
      }
      toast({ title: `✅ Imported ${imported} records` });
    } catch (err: any) {
      toast({ title: 'Import failed', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-card rounded-lg shadow-sm p-4">
      <h2 className="text-sm font-bold mb-3">📦 Data Export & Backup</h2>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="text-xs" onClick={exportPricesCsv}>Export Prices CSV</Button>
        <Button size="sm" variant="outline" className="text-xs" onClick={exportReportsCsv}>Export Reports CSV</Button>
        <Button size="sm" variant="outline" className="text-xs" onClick={exportFullBackup}>Full Backup (JSON)</Button>
        <label>
          <Button size="sm" variant="outline" className="text-xs" disabled={importing} asChild>
            <span>{importing ? 'Importing...' : 'Import Backup'}</span>
          </Button>
          <input type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>
      </div>
    </div>
  );
}
