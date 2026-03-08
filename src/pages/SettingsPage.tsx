import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';
import { CROPS, MANDIS, FARM } from '@/lib/farmConfig';
import { getSettings, saveSettings, type FarmSettings } from '@/lib/settingsStore';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const SettingsPage = () => {
  const [settings, setSettingsState] = useState<FarmSettings>(getSettings());
  const [priceCount, setPriceCount] = useState(0);
  const [daySpan, setDaySpan] = useState(0);

  useEffect(() => {
    supabase.from('daily_prices').select('price_date').then(({ data }) => {
      if (data) {
        setPriceCount(data.length);
        const unique = new Set(data.map(r => r.price_date));
        setDaySpan(unique.size);
      }
    });
  }, []);

  const update = (patch: Partial<FarmSettings>) => {
    const next = { ...settings, ...patch };
    setSettingsState(next);
    saveSettings(patch);
  };

  const toggleCrop = (crop: string) => {
    const next = settings.enabledCrops.includes(crop)
      ? settings.enabledCrops.filter(c => c !== crop)
      : [...settings.enabledCrops, crop];
    update({ enabledCrops: next });
  };

  const toggleMandi = (mandi: string) => {
    const next = settings.enabledMandis.includes(mandi)
      ? settings.enabledMandis.filter(m => m !== mandi)
      : [...settings.enabledMandis, mandi];
    update({ enabledMandis: next });
  };

  const handleClearPrices = async () => {
    const { error } = await supabase.from('daily_prices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setPriceCount(0);
      setDaySpan(0);
      toast({ title: '✅ All cached prices cleared' });
    }
  };

  const handleExportAll = async () => {
    const { data } = await supabase.from('daily_prices').select('*').order('price_date', { ascending: false });
    if (!data || data.length === 0) { toast({ title: 'No data to export' }); return; }
    const csv = ['Date,Commodity,Mandi,Min,Modal,Max,Source', ...data.map(r =>
      `${r.price_date},${r.commodity},${r.mandi},${r.min_price ?? ''},${r.modal_price},${r.max_price ?? ''},${r.source ?? ''}`
    )].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'kisanmitra_prices.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <AppHeader />
      <main className="container mx-auto px-3 py-4 max-w-2xl space-y-4">
        {/* Farm Info */}
        <div className="bg-card rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-bold mb-3">🏡 Farm Information</h2>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Farm: <strong className="text-foreground">{FARM.name}</strong></p>
            <p>Coordinates: <strong className="text-foreground">{FARM.latitude}°N, {FARM.longitude}°E</strong></p>
            <p>District: <strong className="text-foreground">{FARM.district}, {FARM.state}</strong></p>
          </div>
        </div>

        {/* Tracked Crops */}
        <div className="bg-card rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-bold mb-3">🌾 Tracked Crops</h2>
          <div className="space-y-3">
            {CROPS.map(crop => (
              <div key={crop.name} className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{crop.name}</span>
                  <span className="text-xs text-muted-foreground ml-1">({crop.localName})</span>
                </div>
                <Switch
                  checked={settings.enabledCrops.includes(crop.commodityName)}
                  onCheckedChange={() => toggleCrop(crop.commodityName)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Tracked Mandis */}
        <div className="bg-card rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-bold mb-3">🏪 Tracked Mandis</h2>
          <div className="space-y-3">
            {MANDIS.map(mandi => (
              <div key={mandi} className="flex items-center justify-between">
                <span className="text-sm font-medium">{mandi}</span>
                <Switch
                  checked={settings.enabledMandis.includes(mandi)}
                  onCheckedChange={() => toggleMandi(mandi)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Alert Thresholds */}
        <div className="bg-card rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-bold mb-3">📊 Alert Thresholds</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">Price crash alert at: <strong className="text-foreground">{settings.crashThreshold}%</strong> below 90-day average</label>
              <Slider
                value={[settings.crashThreshold]}
                onValueChange={([v]) => update({ crashThreshold: v })}
                min={10}
                max={50}
                step={5}
                className="mt-2"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Price spike alert at: <strong className="text-foreground">{settings.spikeThreshold}%</strong> above 90-day average</label>
              <Slider
                value={[settings.spikeThreshold]}
                onValueChange={([v]) => update({ spikeThreshold: v })}
                min={10}
                max={50}
                step={5}
                className="mt-2"
              />
            </div>
          </div>
        </div>

        {/* Data */}
        <div className="bg-card rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-bold mb-3">💾 Data Management</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Database contains <strong className="text-foreground">{priceCount}</strong> price records spanning <strong className="text-foreground">{daySpan}</strong> days.
          </p>
          <div className="flex gap-2 flex-wrap">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" className="text-xs">Clear All Cached Prices</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all price data?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete all {priceCount} price records. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearPrices}>Yes, clear all</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button size="sm" variant="outline" className="text-xs" onClick={handleExportAll}>Export All Data as CSV</Button>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default SettingsPage;
