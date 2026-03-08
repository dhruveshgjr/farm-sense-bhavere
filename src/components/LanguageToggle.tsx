import type { Lang } from '@/lib/i18n';

interface LanguageToggleProps {
  language: Lang;
  onToggle: (lang: Lang) => void;
}

export function LanguageToggle({ language, onToggle }: LanguageToggleProps) {
  return (
    <div className="flex rounded-md overflow-hidden border border-primary-foreground/30">
      <button
        onClick={() => onToggle('en')}
        className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${
          language === 'en'
            ? 'bg-primary-foreground text-primary'
            : 'text-primary-foreground/80 hover:text-primary-foreground'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => onToggle('mr')}
        className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${
          language === 'mr'
            ? 'bg-primary-foreground text-primary'
            : 'text-primary-foreground/80 hover:text-primary-foreground'
        }`}
      >
        मराठी
      </button>
    </div>
  );
}
