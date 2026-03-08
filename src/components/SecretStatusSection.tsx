import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SECRETS_TO_CHECK = ['DATAGOV_API_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'];

const SETUP_INSTRUCTIONS: Record<string, string[]> = {
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
        if (!error && data) {
          setStatuses(data);
        }
      } catch {
        // Edge function may not exist yet
      }
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
            return (
              <div key={key}>
                <div className="flex items-center gap-2 text-xs">
                  <span>{isSet ? '✅' : '❌'}</span>
                  <span className="font-mono font-medium">{key}</span>
                  <span className="text-muted-foreground">{isSet ? 'Set' : 'Not set'}</span>
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
