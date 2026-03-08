import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SECRETS_TO_CHECK = ['ANTHROPIC_API_KEY', 'DATAGOV_API_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'];

const SECRET_LABELS: Record<string, { setLabel: string; unsetLabel: string }> = {
  ANTHROPIC_API_KEY: {
    setLabel: 'AI Advisor: Active (Direct Anthropic API)',
    unsetLabel: 'AI Advisor: Not configured — add ANTHROPIC_API_KEY',
  },
  DATAGOV_API_KEY: { setLabel: 'Price API: Active', unsetLabel: 'Price API: Not configured' },
  TELEGRAM_BOT_TOKEN: { setLabel: 'Telegram Bot: Active', unsetLabel: 'Telegram Bot: Not configured' },
  TELEGRAM_CHAT_ID: { setLabel: 'Telegram Chat: Active', unsetLabel: 'Telegram Chat: Not configured' },
};

const SETUP_INSTRUCTIONS: Record<string, string[]> = {
  ANTHROPIC_API_KEY: [
    '1. Go to console.anthropic.com',
    '2. Create account → API Keys → Create Key',
    '3. Add as a Cloud secret named ANTHROPIC_API_KEY',
    'Note: Using claude-haiku-4-5-20251001 — approx ₹0.02 per advice generation',
  ],
  DATAGOV_API_KEY: [
    '1. Go to data.gov.in/user/register (free account)',
    '2. After login → API Key section → copy your key',
    '3. Add as a Cloud secret named DATAGOV_API_KEY',
  ],
  TELEGRAM_BOT_TOKEN: [
    '1. Open Telegram → search @BotFather → /newbot',
    '2. Copy the token it gives you',
    '3. Add as a Cloud secret named TELEGRAM_BOT_TOKEN',
  ],
  TELEGRAM_CHAT_ID: [
    '1. Message your bot once',
    '2. Get your Chat ID from @userinfobot',
    '3. Add as a Cloud secret named TELEGRAM_CHAT_ID',
  ],
};

export function SecretStatusSection() {
  const [statuses, setStatuses] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      try {
        const { data, error } = await supabase.functions.invoke('check-secrets', {
          body: { keys: SECRETS_TO_CHECK },
        });
        if (!error && data) setStatuses(data);
      } catch {}
      setLoading(false);
    }
    check();
  }, []);

  return (
    <div className="bg-card rounded-lg shadow-sm p-4">
      <h2 className="text-sm font-bold mb-3">🔑 API Keys</h2>
      {loading ? (
        <p className="text-xs text-muted-foreground">Checking...</p>
      ) : (
        <div className="space-y-3">
          {SECRETS_TO_CHECK.map(key => {
            const isSet = statuses[key] === true;
            const labels = SECRET_LABELS[key];
            return (
              <div key={key}>
                <div className="flex items-center gap-2 text-xs">
                  <span>{isSet ? '✅' : '❌'}</span>
                  <span className="font-medium">{isSet ? labels?.setLabel : labels?.unsetLabel}</span>
                </div>
                {!isSet && SETUP_INSTRUCTIONS[key] && (
                  <div className="ml-6 mt-1 text-[10px] text-muted-foreground space-y-0.5">
                    {SETUP_INSTRUCTIONS[key].map((s, i) => <p key={i}>{s}</p>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
