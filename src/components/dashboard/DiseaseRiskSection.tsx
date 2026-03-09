import { memo } from 'react';
import { computeDiseaseRisks, type ForecastDay, type DiseaseRisk } from '@/lib/advisoryEngine';

interface DiseaseRiskSectionProps {
  forecast?: ForecastDay[];
}

const CROP_EMOJI: Record<string, string> = {
  'Tomato': '🍅',
  'Onion': '🧅',
  'Banana': '🍌',
  'Bitter Gourd': '🥒',
  'Papaya': '🍈',
};

export const DiseaseRiskSection = memo(function DiseaseRiskSection({ forecast }: DiseaseRiskSectionProps) {
  if (!forecast || forecast.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow-sm overflow-hidden">
        <div className="section-header section-header-advisory">🦠 Disease Risk Forecast</div>
        <div className="p-4 text-center text-muted-foreground text-sm">
          Loading weather data for disease risk analysis...
        </div>
      </div>
    );
  }

  const risks = computeDiseaseRisks(forecast);

  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden">
      <div className="section-header section-header-advisory">🦠 Disease Risk Forecast</div>
      <div className="p-3">
        {risks.length === 0 ? (
          <div className="flex items-start gap-2 py-2">
            <span className="text-success text-lg">✅</span>
            <div>
              <p className="text-sm font-medium">No significant disease risks detected</p>
              <p className="text-xs text-muted-foreground">
                Weather conditions are favorable. Continue routine monitoring and preventive sprays.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {risks.map((risk, i) => (
              <div key={`${risk.crop}-${risk.disease}-${i}`} className="border border-border rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{CROP_EMOJI[risk.crop] || '🌾'}</span>
                    <div>
                      <p className="text-sm font-bold">{risk.crop}</p>
                      <p className="text-xs font-medium">{risk.disease}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      risk.risk === 'HIGH' ? 'bg-destructive/20 text-destructive' :
                      risk.risk === 'MEDIUM' ? 'bg-warning/20 text-foreground' :
                      'bg-success/20 text-success'
                    }`}>
                      {risk.risk} RISK
                    </span>
                    <span className="text-sm font-bold">{risk.probability}%</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-start gap-1.5">
                    <span className="text-muted-foreground">📊</span>
                    <span className="text-muted-foreground">{risk.trigger}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span>💊</span>
                    <span className="font-medium">{risk.prevention}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span>⏰</span>
                    <span className={`font-bold ${risk.risk === 'HIGH' ? 'text-destructive' : 'text-warning'}`}>
                      {risk.treatmentWindow}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            <p className="text-[9px] text-muted-foreground border-t border-border pt-2">
              💡 Disease probability based on weather conditions. Always scout fields before applying treatments.
            </p>
          </div>
        )}
      </div>
    </div>
  );
});
