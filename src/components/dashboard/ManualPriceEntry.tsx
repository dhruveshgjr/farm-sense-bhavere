import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CROPS, MANDIS } from '@/lib/farmConfig';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { PenLine } from 'lucide-react';

function ManualPriceForm({ onClose }: { onClose: () => void }) {
  const [crop, setCrop] = useState(CROPS[0].commodityName);
  const [mandi, setMandi] = useState<string>(MANDIS[0]);
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!price || isNaN(Number(price))) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('daily_prices').upsert({
        price_date: date,
        commodity: crop,
        mandi,
        modal_price: Number(price),
        source: 'manual',
      }, { onConflict: 'price_date,commodity,mandi' });
      if (error) throw error;
      toast({ title: '✅ Price saved', description: `${crop} at ${mandi} — ₹${price}/qtl` });
      queryClient.invalidateQueries({ queryKey: ['prices'] });
      onClose();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div>
        <Label>Crop</Label>
        <Select value={crop} onValueChange={setCrop}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CROPS.map(c => <SelectItem key={c.commodityName} value={c.commodityName}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Mandi</Label>
        <Select value={mandi} onValueChange={setMandi}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {MANDIS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Modal Price (₹/qtl)</Label>
        <Input type="number" placeholder="e.g. 2500" value={price} onChange={e => setPrice(e.target.value)} min="0" required />
      </div>
      <div>
        <Label>Date</Label>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
      </div>
      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? 'Saving...' : 'Save Price'}
      </Button>
    </form>
  );
}

export function ManualPriceEntry() {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button size="sm" variant="outline" className="text-xs">
            <PenLine className="h-3 w-3 mr-1" />Manual Entry
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader><SheetTitle>Enter Mandi Price</SheetTitle></SheetHeader>
          <ManualPriceForm onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-xs">
          <PenLine className="h-3 w-3 mr-1" />Manual Entry
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Enter Mandi Price</DialogTitle></DialogHeader>
        <ManualPriceForm onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
