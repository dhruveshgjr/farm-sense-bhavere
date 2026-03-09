import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CROPS, ALL_MANDIS, PRICE_RANGES, matchCropName } from '@/lib/farmConfig';
import { Check, X, Trash2 } from 'lucide-react';

interface ParsedRow {
  crop: string;
  mandi: string;
  price: number;
  date: string;
  valid: boolean;
  error?: string;
  originalCrop: string;
}

interface ImportRecord {
  id: string;
  price_date: string;
  commodity: string;
  mandi: string;
  modal_price: number;
  source: string;
  fetched_at: string;
}

function validatePrice(crop: string, price: number): { valid: boolean; error?: string } {
  const range = PRICE_RANGES[crop];
  if (!range) return { valid: true };
  if (price < range.min) return { valid: false, error: `Price below ₹${range.min}` };
  if (price > range.max) return { valid: false, error: `Price above ₹${range.max}` };
  return { valid: true };
}

function parseDate(input: string): string | null {
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const d = new Date(input);
    if (!isNaN(d.getTime())) return input;
  }
  // Try DD/MM/YYYY or DD-MM-YYYY
  const parts = input.split(/[\/\-]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
    if (c.length === 4) return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
  }
  return null;
}

const DataImportPage = () => {
  const queryClient = useQueryClient();
  
  // Single entry state
  const [singleCrop, setSingleCrop] = useState(CROPS[0].commodityName);
  const [singleMandi, setSingleMandi] = useState<string>(ALL_MANDIS[0]);
  const [singlePrice, setSinglePrice] = useState('');
  const [singleDate, setSingleDate] = useState(new Date().toISOString().split('T')[0]);
  const [singleSaving, setSingleSaving] = useState(false);
  const [singleSuccess, setSingleSuccess] = useState<string | null>(null);

  // Bulk paste state
  const [bulkText, setBulkText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');

  // History state
  const [history, setHistory] = useState<ImportRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    document.title = 'KisanMitra — Import Data';
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoadingHistory(true);
    const { data } = await supabase
      .from('daily_prices')
      .select('id, price_date, commodity, mandi, modal_price, source, fetched_at')
      .or('source.eq.manual,source.eq.bulk-import')
      .order('fetched_at', { ascending: false })
      .limit(20);
    setHistory(data || []);
    setLoadingHistory(false);
  };

  // Single entry handlers
  const handleSingleSave = async () => {
    if (!singlePrice || isNaN(Number(singlePrice))) {
      toast({ title: 'Invalid price', variant: 'destructive' });
      return;
    }
    const priceNum = Number(singlePrice);
    const validation = validatePrice(singleCrop, priceNum);
    if (!validation.valid) {
      toast({ title: 'Price out of range', description: validation.error, variant: 'destructive' });
      return;
    }

    setSingleSaving(true);
    setSingleSuccess(null);
    try {
      const { error } = await supabase.from('daily_prices').upsert({
        price_date: singleDate,
        commodity: singleCrop,
        mandi: singleMandi,
        modal_price: priceNum,
        source: 'manual',
      }, { onConflict: 'price_date,commodity,mandi' });
      
      if (error) throw error;
      
      setSingleSuccess(`✅ Saved: ${singleCrop} at ${singleMandi} — ₹${priceNum}/qtl on ${singleDate}`);
      setSinglePrice('');
      queryClient.invalidateQueries({ queryKey: ['prices'] });
      loadHistory();
      toast({ title: '✅ Price saved', description: `${singleCrop} at ${singleMandi} — ₹${priceNum}/qtl` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSingleSaving(false);
    }
  };

  // Bulk paste handlers
  const handleParse = () => {
    const lines = bulkText.trim().split('\n').filter(l => l.trim());
    const parsed: ParsedRow[] = [];

    for (const line of lines) {
      // Split by comma or tab
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      if (parts.length < 4) {
        parsed.push({ crop: '', mandi: '', price: 0, date: '', valid: false, error: 'Need 4 fields: Crop, Mandi, Price, Date', originalCrop: '' });
        continue;
      }

      const [cropRaw, mandiRaw, priceRaw, dateRaw] = parts.map(p => p.trim());
      
      // Match crop
      const matchedCrop = matchCropName(cropRaw);
      if (!matchedCrop) {
        parsed.push({ crop: cropRaw, mandi: mandiRaw, price: 0, date: dateRaw, valid: false, error: `Unknown crop: ${cropRaw}`, originalCrop: cropRaw });
        continue;
      }

      // Parse price
      const price = parseFloat(priceRaw.replace(/[₹,]/g, ''));
      if (isNaN(price)) {
        parsed.push({ crop: matchedCrop, mandi: mandiRaw, price: 0, date: dateRaw, valid: false, error: 'Invalid price', originalCrop: cropRaw });
        continue;
      }

      // Validate price range
      const priceValidation = validatePrice(matchedCrop, price);
      if (!priceValidation.valid) {
        parsed.push({ crop: matchedCrop, mandi: mandiRaw, price, date: dateRaw, valid: false, error: priceValidation.error, originalCrop: cropRaw });
        continue;
      }

      // Parse date
      const parsedDate = parseDate(dateRaw);
      if (!parsedDate) {
        parsed.push({ crop: matchedCrop, mandi: mandiRaw, price, date: dateRaw, valid: false, error: 'Invalid date format', originalCrop: cropRaw });
        continue;
      }

      parsed.push({ crop: matchedCrop, mandi: mandiRaw, price, date: parsedDate, valid: true, originalCrop: cropRaw });
    }

    setParsedRows(parsed);
  };

  const handleImport = async () => {
    const validRows = parsedRows.filter(r => r.valid);
    if (validRows.length === 0) {
      toast({ title: 'No valid rows to import', variant: 'destructive' });
      return;
    }

    setImporting(true);
    let imported = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      setImportProgress(`Importing ${i + 1}/${validRows.length}...`);
      
      try {
        const { error } = await supabase.from('daily_prices').upsert({
          price_date: row.date,
          commodity: row.crop,
          mandi: row.mandi,
          modal_price: row.price,
          source: 'bulk-import',
        }, { onConflict: 'price_date,commodity,mandi' });
        
        if (!error) imported++;
      } catch {}
    }

    const skipped = validRows.length - imported;
    setImportProgress(`✅ ${imported} records imported${skipped > 0 ? `. ${skipped} skipped.` : '.'}`);
    setImporting(false);
    setParsedRows([]);
    setBulkText('');
    queryClient.invalidateQueries({ queryKey: ['prices'] });
    loadHistory();
    toast({ title: '✅ Import complete', description: `${imported} records imported` });
  };

  const handleClearManualData = async () => {
    const { error } = await supabase
      .from('daily_prices')
      .delete()
      .or('source.eq.manual,source.eq.bulk-import');
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '✅ Manual data cleared' });
      loadHistory();
      queryClient.invalidateQueries({ queryKey: ['prices'] });
    }
  };

  const validCount = parsedRows.filter(r => r.valid).length;
  const invalidCount = parsedRows.filter(r => !r.valid).length;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <AppHeader />
      <main className="container mx-auto px-3 py-4 max-w-2xl space-y-4">
        <h1 className="text-lg font-bold">📥 Import Price Data</h1>
        <p className="text-sm text-muted-foreground">Enter mandi prices from your research — the app will run trend analysis and generate sell signals.</p>

        {/* Section A: Quick Single Entry */}
        <div className="bg-card rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-bold mb-3">Quick Single Entry</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Crop</Label>
              <Select value={singleCrop} onValueChange={setSingleCrop}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CROPS.map(c => <SelectItem key={c.commodityName} value={c.commodityName}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Mandi</Label>
              <Select value={singleMandi} onValueChange={setSingleMandi}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_MANDIS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Price (₹/qtl)</Label>
              <Input type="number" placeholder="e.g. 2500" value={singlePrice} onChange={e => setSinglePrice(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={singleDate} onChange={e => setSingleDate(e.target.value)} className="mt-1" />
            </div>
          </div>
          <Button onClick={handleSingleSave} disabled={singleSaving} className="w-full mt-3">
            {singleSaving ? 'Saving...' : 'Save Price'}
          </Button>
          {singleSuccess && <p className="text-xs text-success mt-2">{singleSuccess}</p>}
        </div>

        {/* Section B: Bulk Paste */}
        <div className="bg-card rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-bold mb-3">Bulk Paste (Power Feature)</h2>
          <p className="text-xs text-muted-foreground mb-2">Paste multiple prices — one per line. Format: Crop, Mandi, Price, Date</p>
          <Textarea
            placeholder={`Tomato, Nashik, 2500, 2026-03-08
Onion, Lasalgaon, 1800, 2026-03-08
Banana, Nashik, 3200, 2026-03-08`}
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            className="min-h-[120px] font-mono text-xs"
          />
          <div className="flex gap-2 mt-3">
            <Button variant="outline" onClick={handleParse} disabled={!bulkText.trim()}>Parse & Preview</Button>
            {parsedRows.length > 0 && validCount > 0 && (
              <Button onClick={handleImport} disabled={importing}>
                {importing ? importProgress : `Import ${validCount} Valid Rows`}
              </Button>
            )}
          </div>

          {parsedRows.length > 0 && (
            <div className="mt-4">
              <p className="text-xs mb-2">
                <span className="text-success font-medium">✅ {validCount} valid</span>
                {invalidCount > 0 && <span className="text-destructive font-medium ml-2">❌ {invalidCount} invalid</span>}
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Crop</TableHead>
                      <TableHead className="text-xs">Mandi</TableHead>
                      <TableHead className="text-xs">Price</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((row, i) => (
                      <TableRow key={i} className={row.valid ? '' : 'bg-destructive/10'}>
                        <TableCell className="text-xs">{row.crop}</TableCell>
                        <TableCell className="text-xs">{row.mandi}</TableCell>
                        <TableCell className="text-xs">₹{row.price || '—'}</TableCell>
                        <TableCell className="text-xs">{row.date}</TableCell>
                        <TableCell className="text-xs">
                          {row.valid ? (
                            <span className="text-success flex items-center gap-1"><Check className="h-3 w-3" /> Valid</span>
                          ) : (
                            <span className="text-destructive flex items-center gap-1"><X className="h-3 w-3" /> {row.error}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {importProgress && !importing && importProgress.startsWith('✅') && (
            <p className="text-xs text-success mt-2">{importProgress}</p>
          )}
        </div>

        {/* Section C: Import History */}
        <div className="bg-card rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold">Recent Manual Imports</h2>
            {history.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" className="text-xs">
                    <Trash2 className="h-3 w-3 mr-1" /> Clear All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all manual data?</AlertDialogTitle>
                    <AlertDialogDescription>This will delete all manually entered and bulk-imported price records ({history.length} shown).</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearManualData}>Yes, clear all</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {loadingHistory ? (
            <p className="text-xs text-muted-foreground">Loading...</p>
          ) : history.length === 0 ? (
            <p className="text-xs text-muted-foreground">No manual imports yet. Enter prices above to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Crop</TableHead>
                    <TableHead className="text-xs">Mandi</TableHead>
                    <TableHead className="text-xs">Price</TableHead>
                    <TableHead className="text-xs">Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{new Date(r.price_date).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell className="text-xs">{r.commodity}</TableCell>
                      <TableCell className="text-xs">{r.mandi}</TableCell>
                      <TableCell className="text-xs font-medium">₹{r.modal_price.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.source}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default DataImportPage;
