import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';
import { CROPS, MANDIS, FARM } from '@/lib/farmConfig';
import { getSettings, saveSettings, type FarmSettings } from '@/lib/settingsStore';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { NotificationSettings } from '@/components/NotificationSettings';
import { SystemHealthCheck } from '@/components/SystemHealthCheck';
import { SecretStatusSection } from '@/components/SecretStatusSection';
import { DataExportSection } from '@/components/DataExportSection';
import { TelegramSettings } from '@/components/TelegramSettings';
import { SowingIntelForm } from '@/components/SowingIntelForm';
import { formatLastUpdated } from '@/lib/timeFormat';
import { getLastDailyFetch } from '@/lib/cronManager';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const SettingsPage = () => {
  const [settings, setSettingsState] = useState<FarmSettings>(getSettings());
  const [priceCount, setPriceCount] = useState(0);
  const [daySpan, setDaySpan] = useState(0);
  const [seeding, setSeeding] = useState(false);
  const [seedProgress, setSeedProgress] = useState('');
  const [seedStep, setSeedStep] = useState(0);
  const [lastAutoRun, setLastAutoRun] = useState<string | null>(null);
  const [todayRecords, setTodayRecords] = useState(0);
  const [cronRunning, setCronRunning] = useState(false);

  useEffect(() => {
    document.title = 'KisanMitra — Settings';
    async function load() {
      const { data } = await supabase.from('daily_prices').select('price_date');
      if (data) { setPriceCount(data.length); setDaySpan(new Set(data.map(r => r.price_date)).size); }
      const { data: reports } = await supabase.from('report_history').select('generated_at, notes').order('generated_at', { ascending: false }).limit(1);
      if (reports?.[0]) setLastAutoRun(reports[0].generated_at);
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase.from('daily_prices').select('*', { count: 'exact', head: true }).eq('price_date', today);
      setTodayRecords(count ?? 0);
    }
    load();
  }, []);

  const update = (patch: Partial<FarmSettings>) => { const next = { ...settings, ...patch }; setSettingsState(next); saveSettings(patch); };
  const toggleCrop = (crop: string) => { const next = settings.enabledCrops.includes(crop) ? settings.enabledCrops.filter(c => c !== crop) : [...settings.enabledCrops, crop]; update({ enabledCrops: next }); };
  const toggleMandi = (mandi: string) => { const next = settings.enabledMandis.includes(mandi) ? settings.enabledMandis.filter(m => m !== mandi) : [...settings.enabledMandis, mandi]; update({ enabledMandis: next }); };

  const handleClearPrices = async () => {
    const { error } = await supabase.from('daily_prices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
    else { setPriceCount(0); setDaySpan(0); toast({ title: '✅ All cached prices cleared' }); }
  };

  const handleSeedHistory = async () => {
    setSeeding(true); setSeedStep(0);
    try {
      const combos = CROPS.flatMap(c => MANDIS.map(m => ({ commodity: c.commodityName, mandi: m })));
      let totalInserted = 0;
      for (let i = 0; i < combos.length; i++) {
        const combo = combos[i];
        setSeedProgress(`Fetching ${combo.commodity} at ${combo.mandi}... (${i + 1}/10)`);
        setSeedStep(i + 1);
        try {
          const { data, error } = await supabase.functions.invoke('seed-historical-prices', { body: { commodity: combo.commodity, mandi: combo.mandi, days: 90 } });
          if (!error && data?.inserted) totalInserted += data.inserted;
        } catch {}
      }
      const { data: refreshed } = await supabase.from('daily_prices').select('price_date');
      if (refreshed) { setPriceCount(refreshed.length); setDaySpan(new Set(refreshed.map(r => r.price_date)).size); }
      toast({ title: `✅ Loaded ${totalInserted} price records. Trend analysis is now active.` });
      setSeedProgress(`✅ Historical data loaded. Check Dashboard for trend analysis.`);
    } catch (err: any) { toast({ title: 'Seed failed', description: err.message, variant: 'destructive' }); setSeedProgress(''); }
    finally { setSeeding(false); }
  };

  const handleRunCron = async () => {
    setCronRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('daily-price-cron', { method: 'POST' });
      if (error) throw error;
      toast({ title: '✅ Manual fetch complete', description: `Fetched: ${data?.fetched ?? 0}, Alerts: ${data?.danger_alerts ?? 0}` });
      setLastAutoRun(new Date().toISOString());
      const { count } = await supabase.from('daily_prices').select('*', { count: 'exact', head: true }).eq('price_date', new Date().toISOString().split('T')[0]);
      setTodayRecords(count ?? 0);
    } catch (err: any) { toast({ title: 'Fetch failed', description: err.message, variant: 'destructive' }); }
    finally { setCronRunning(false); }
  };

  const lastClientFetch = getLastDailyFetch();
  const getAutoRunStatus = () => {
    const ref = lastAutoRun || lastClientFetch;
    if (!ref) return { dot: 'bg-destructive', label: 'Never run' };
    const hours = (Date.now() - new Date(ref).getTime()) / 3600000;
    if (hours < 25) return { dot: 'bg-success', label: 'Healthy' };
    if (hours < 48) return { dot: 'bg-warning', label: 'Delayed' };
    return { dot: 'bg-destructive', label: 'Stale' };
  };
  const autoRunStatus = getAutoRunStatus();

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <AppHeader />
      <main className="container mx-auto px-3 py-4 max-w-2xl space-y-4">
        <div className="bg-card rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-bold mb-3">🏡 Farm Information</h2>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Farm: <strong className="text-foreground">{FARM.name}</strong></p>
            <p>Coordinates: <strong className="text-foreground">{FARM.latitude}°N, {FARM.longitude}°E</strong></p>
            <p>District: <strong className="text-foreground">{FARM.district}, {FARM.state}</strong></p>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-bold mb-3">⏰ Automation Status</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full ${autoRunStatus.dot}`} /><span className="text-muted-foreground">Status: <strong className="text-foreground">{autoRunStatus.label}</strong></span></div>
            <p className="text-xs text-muted-foreground">Auto-fetch: Triggered on first daily app open (IST)</p>
            <p className="text-xs text-muted-foreground">Last fetch: <strong className="text-foreground">{lastClientFetch || (lastAutoRun ? formatLastUpdated(lastAutoRun) : 'Never')}</strong></p>
            <p className="text-xs text-muted-foreground">Records fetched today: <strong className="text-foreground">{todayRecords}</strong></p>
            <Button size="sm" onClick={handleRunCron} disabled={cronRunning} className="text-xs mt-2">{cronRunning ? 'Running...' : 'Run Now'}</Button>
          </div>
        </div>

        {priceCount < 100 && (
          <div className="bg-info/10 border border-info rounded-lg p-4">
            <h2 className="text-sm font-bold mb-2">📥 Historical Data Bootstrap</h2>
            <p className="text-xs text-muted-foreground mb-3">Build 90 days of price history to enable trend analysis</p>
            {seedProgress && (<div className="mb-3"><p className="text-xs mb-1">{seedProgress}</p><Progress value={(seedStep / 10) * 100} className="h-2" /></div>)}
            <Button size="sm" onClick={handleSeedHistory} disabled={seeding} className="text-xs">{seeding ? 'Loading...' : 'Load 90-Day History'}</Button>
          </div>
        )}

        <div className="bg-card rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-bold mb-3">🌾 Tracked Crops</h2>
          <div className="space-y-3">
            {CROPS.map(crop => (<div key={crop.name} className="flex items-center justify-between"><div><span className="text-sm font-medium">{crop.name}</span><span className="text-xs text-muted-foreground ml-1">({crop.localName})</span></div><Switch checked={settings.enabledCrops.includes(crop.commodityName)} onCheckedChange={() => toggleCrop(crop.commodityName)} /></div>))}
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-bold mb-3">🏪 Tracked Mandis</h2>
          <div className="space-y-3">
            {MANDIS.map(mandi => (<div key={mandi} className="flex items-center justify-between"><span className="text-sm font-medium">{mandi}</span><Switch checked={settings.enabledMandis.includes(mandi)} onCheckedChange={() => toggleMandi(mandi)} /></div>))}
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-bold mb-3">📊 Alert Thresholds</h2>
          <div className="space-y-4">
            <div><label className="text-xs text-muted-foreground">Price crash alert at: <strong className="text-foreground">{settings.crashThreshold}%</strong> below 90-day average</label><Slider value={[settings.crashThreshold]} onValueChange={([v]) => update({ crashThreshold: v })} min={10} max={50} step={5} className="mt-2" /></div>
            <div><label className="text-xs text-muted-foreground">Price spike alert at: <strong className="text-foreground">{settings.spikeThreshold}%</strong> above 90-day average</label><Slider value={[settings.spikeThreshold]} onValueChange={([v]) => update({ spikeThreshold: v })} min={10} max={50} step={5} className="mt-2" /></div>
          </div>
        </div>

        <SowingIntelForm />
        <NotificationSettings />
        <TelegramSettings />
        <SecretStatusSection />
        <SystemHealthCheck />
        <DataExportSection />

        <div className="bg-card rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-bold mb-3">💾 Data Management</h2>
          <p className="text-xs text-muted-foreground mb-3">Database contains <strong className="text-foreground">{priceCount}</strong> price records spanning <strong className="text-foreground">{daySpan}</strong> days.</p>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button size="sm" variant="destructive" className="text-xs">Clear All Cached Prices</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Clear all price data?</AlertDialogTitle><AlertDialogDescription>This will permanently delete all {priceCount} price records.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleClearPrices}>Yes, clear all</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="bg-card rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-bold mb-3">ℹ️ About</h2>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p className="font-bold text-foreground">KisanMitra v1.0</p>
            <p>Personal Farm Intelligence for Bhavere, Nashik</p>
            <p>Crops: Banana · Tomato · Karela · Papaya · Onion</p>
            <p>Data sources: Open-Meteo, data.gov.in, Agmarknet</p>
            <p>AI: Claude (Anthropic) — Direct API</p>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default SettingsPage;
