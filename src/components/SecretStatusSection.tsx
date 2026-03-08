import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';

const SECRETS_TO_CHECK = ['DATAGOV_API_KEY', 'ANTHROPIC_API_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'];

export function SecretStatusSection() {
  const { t } = useLanguage();
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

  const getDisplay = (key: string, isSet: boolean) => {
    if (key === 'DATAGOV_API_KEY') {
      return isSet
        ? { icon: '✅', label: 'Price API: Active (user key)' }
        : { icon: '✅', label: `Price API: ${t('using_public_data')} — ${t('no_key_needed')}` };
    }
    if (key === 'ANTHROPIC_API_KEY') {
      return isSet
        ? { icon: '✅', label: 'AI Advisor: Active (Direct Anthropic API)' }
        : { icon: '✅', label: `${t('smart_advisor_active')} — ${t('no_key_needed')}` };
    }
    if (key === 'TELEGRAM_BOT_TOKEN') {
      return isSet
        ? { icon: '✅', label: 'Telegram Bot: Active' }
        : { icon: '❌', label: 'Telegram Bot: Not configured (optional)' };
    }
    if (key === 'TELEGRAM_CHAT_ID') {
      return isSet
        ? { icon: '✅', label: 'Telegram Chat: Active' }
        : { icon: '❌', label: 'Telegram Chat: Not configured (optional)' };
    }
    return { icon: isSet ? '✅' : '❌', label: key };
  };

  const UPGRADE_INSTRUCTIONS: Record<string, string[]> = {
    DATAGOV_API_KEY: [
      'Optional: Use your own key for higher rate limits',
      '1. Go to data.gov.in/user/register (free)',
      '2. Copy your API key',
      '3. Add as a Cloud secret named DATAGOV_API_KEY',
    ],
    ANTHROPIC_API_KEY: [
      'Optional: Upgrade to AI-powered advice (Claude)',
      '1. Go to console.anthropic.com',
      '2. Create account → API Keys → Create Key',
      '3. Add as a Cloud secret named ANTHROPIC_API_KEY',
      'Cost: ~₹0.02 per advice generation',
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

  return (
    <div className="bg-card rounded-lg shadow-sm p-4">
      <h2 className="text-sm font-bold mb-3">🔑 API Keys & Services</h2>
      {loading ? (
        <p className="text-xs text-muted-foreground">Checking...</p>
      ) : (
        <div className="space-y-3">
          {SECRETS_TO_CHECK.map(key => {
            const isSet = statuses[key] === true;
            const display = getDisplay(key, isSet);
            const showUpgrade = !isSet && (key === 'DATAGOV_API_KEY' || key === 'ANTHROPIC_API_KEY');
            const showSetup = !isSet && (key === 'TELEGRAM_BOT_TOKEN' || key === 'TELEGRAM_CHAT_ID');
            return (
              <div key={key}>
                <div className="flex items-center gap-2 text-xs">
                  <span>{display.icon}</span>
                  <span className="font-medium">{display.label}</span>
                </div>
                {(showUpgrade || showSetup) && UPGRADE_INSTRUCTIONS[key] && (
                  <div className="ml-6 mt-1 text-[10px] text-muted-foreground space-y-0.5">
                    {UPGRADE_INSTRUCTIONS[key].map((s, i) => <p key={i}>{s}</p>)}
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
