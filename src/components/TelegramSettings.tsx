import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function TelegramSettings() {
  const [testing, setTesting] = useState(false);

  const handleTestMessage = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-telegram-report', {
        body: { message: '✅ KisanMitra test message — Telegram connected!', parse_mode: 'Markdown' },
      });
      if (error) throw error;
      if (data?.ok) {
        toast({ title: '✅ Test message sent to Telegram!' });
      } else {
        toast({ title: '❌ Failed', description: data?.description || 'Check bot token and chat ID', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: '❌ Telegram failed', description: err.message, variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-card rounded-lg shadow-sm p-4">
      <h2 className="text-sm font-bold mb-3">📱 Telegram Delivery</h2>
      <p className="text-xs text-muted-foreground mb-3">
        Receive daily reports via Telegram. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID as Cloud secrets.
      </p>
      <div className="space-y-2 text-[10px] text-muted-foreground mb-3">
        <p>1. Open Telegram → search @BotFather → /newbot</p>
        <p>2. Copy the token it gives you</p>
        <p>3. Message your bot once, then get your Chat ID from @userinfobot</p>
        <p>4. Add both as Cloud secrets: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID</p>
      </div>
      <Button size="sm" className="text-xs" onClick={handleTestMessage} disabled={testing}>
        {testing ? 'Sending...' : 'Send Test Message'}
      </Button>
    </div>
  );
}
