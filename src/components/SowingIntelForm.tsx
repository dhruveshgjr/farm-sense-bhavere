import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CROPS } from '@/lib/farmConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import type { SowingRecord } from '@/components/dashboard/SupplyIntelSection';

const SOURCES = ['FASAL Bulletin', 'District Agriculture Office', 'Personal Observation', 'Other'];

export function SowingIntelForm() {
  const [records, setRecords] = useState<SowingRecord[]>([]);
  const [crop, setCrop] = useState(CROPS[0].commodityName);
  const [season, setSeason] = useState('Rabi 2025-26');
  const [pct, setPct] = useState(0);
  const [source, setSource] = useState('Personal Observation');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadRecords = async () => {
    const { data } = await supabase.from('sowing_intel').select('*').order('recorded_date', { ascending: false });
    setRecords((data as SowingRecord[]) ?? []);
  };

  useEffect(() => { loadRecords(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('sowing_intel').upsert({
        commodity: crop,
        season,
        area_vs_lastyear_pct: pct,
        source,
        notes: notes || null,
        district: 'Nashik',
      }, { onConflict: 'season,commodity,district' });
      if (error) throw error;
      toast({ title: '✅ Sowing data saved' });
      loadRecords();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('sowing_intel').delete().eq('id', id);
    loadRecords();
  };

  return (
    <div className="bg-card rounded-lg shadow-sm p-4">
      <h2 className="text-sm font-bold mb-3">🌱 Sowing Intelligence</h2>

      <div className="space-y-3 mb-4">
        <div>
          <Label className="text-xs">Crop</Label>
          <Select value={crop} onValueChange={setCrop}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CROPS.map(c => <SelectItem key={c.commodityName} value={c.commodityName}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Season</Label>
          <Input value={season} onChange={e => setSeason(e.target.value)} placeholder="e.g. Rabi 2025-26" className="text-sm" />
        </div>
        <div>
          <Label className="text-xs">
            vs Last Year: <strong>{pct > 0 ? `+${pct}%` : `${pct}%`}</strong>
            {pct > 0 ? ' more planted' : pct < 0 ? ' less planted' : ' same as last year'}
          </Label>
          <Slider value={[pct]} onValueChange={([v]) => setPct(v)} min={-80} max={80} step={5} className="mt-2" />
        </div>
        <div>
          <Label className="text-xs">Source</Label>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Notes (optional)</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="text-sm" />
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs w-full">
          {saving ? 'Saving...' : 'Save Sowing Data'}
        </Button>
      </div>

      {records.length > 0 && (
        <div className="border-t border-border pt-3">
          <h3 className="text-xs font-bold mb-2">Existing Records</h3>
          <div className="space-y-1.5">
            {records.map(r => (
              <div key={r.id} className="flex items-center justify-between text-xs bg-muted rounded px-2 py-1.5">
                <span>{r.commodity} — {r.season} — {r.area_vs_lastyear_pct != null ? `${r.area_vs_lastyear_pct > 0 ? '+' : ''}${r.area_vs_lastyear_pct}%` : '—'}</span>
                <button onClick={() => handleDelete(r.id)} className="text-danger text-[10px] underline">Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 text-[10px] text-muted-foreground space-y-0.5">
        <p>Check FASAL bulletin: <a href="https://fasal.dacnet.nic.in/" target="_blank" rel="noopener" className="text-info underline">fasal.dacnet.nic.in</a></p>
        <p>District agriculture office: Nashik Zilla Parishad Agriculture Department</p>
      </div>
    </div>
  );
}
