import { CROPS } from '@/lib/farmConfig';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type Activity = 'harvest' | 'growing' | 'planting' | 'off';

const CROP_CALENDAR: Record<string, Activity[]> = {
  'Banana':       ['growing', 'growing', 'growing', 'harvest', 'harvest', 'planting', 'planting', 'growing', 'growing', 'growing', 'growing', 'growing'],
  'Tomato':       ['harvest', 'harvest', 'harvest', 'off', 'off', 'planting', 'planting', 'growing', 'harvest', 'harvest', 'planting', 'planting'],
  'Bitter Gourd': ['off', 'planting', 'planting', 'harvest', 'harvest', 'planting', 'planting', 'harvest', 'harvest', 'off', 'off', 'off'],
  'Papaya':       ['growing', 'growing', 'harvest', 'harvest', 'harvest', 'planting', 'planting', 'growing', 'growing', 'growing', 'growing', 'growing'],
  'Onion':        ['growing', 'harvest', 'harvest', 'harvest', 'off', 'off', 'off', 'off', 'off', 'planting', 'planting', 'growing'],
};

const ACTIVITY_COLORS: Record<Activity, string> = {
  harvest: 'bg-success',
  growing: 'bg-warning',
  planting: 'bg-info',
  off: 'bg-muted',
};

const ACTIVITY_LABELS: Record<Activity, string> = {
  harvest: '🟢 Harvest',
  growing: '🟡 Growing',
  planting: '🔵 Planting',
  off: '⚪ Off season',
};

export function CropCalendar() {
  const currentMonth = new Date().getMonth();

  const harvestable = CROPS.filter(c => CROP_CALENDAR[c.commodityName]?.[currentMonth] === 'harvest');
  const plantable = CROPS.filter(c => CROP_CALENDAR[c.commodityName]?.[currentMonth] === 'planting');

  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden">
      <div className="section-header section-header-advisory">📅 Crop Activity Calendar</div>
      <div className="p-3">
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-3 text-[10px]">
          {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
            <span key={key} className="flex items-center gap-1">
              <span className={`w-2.5 h-2.5 rounded-sm ${ACTIVITY_COLORS[key as Activity]}`} />
              {label}
            </span>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] min-w-[500px]">
            <thead>
              <tr>
                <th className="text-left py-1 px-1 font-semibold text-xs">Crop</th>
                {MONTH_LABELS.map((m, i) => (
                  <th
                    key={m}
                    className={`text-center py-1 px-0.5 font-medium ${i === currentMonth ? 'text-foreground font-bold' : 'text-muted-foreground'}`}
                  >
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CROPS.map(crop => {
                const activities = CROP_CALENDAR[crop.commodityName] || Array(12).fill('off');
                return (
                  <tr key={crop.name}>
                    <td className="py-1.5 px-1 text-xs font-medium whitespace-nowrap">{crop.name}</td>
                    {activities.map((act, i) => (
                      <td key={i} className="text-center py-1.5 px-0.5">
                        <div
                          className={`w-full h-4 rounded-sm ${ACTIVITY_COLORS[act]} ${i === currentMonth ? 'ring-2 ring-foreground ring-offset-1' : ''}`}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* This month summary */}
        <div className="mt-3 space-y-1 text-xs">
          {harvestable.length > 0 && (
            <p>🟢 <strong>Harvest this month:</strong> {harvestable.map(c => c.name).join(', ')}</p>
          )}
          {plantable.length > 0 && (
            <p>🔵 <strong>Plant this month:</strong> {plantable.map(c => c.name).join(', ')}</p>
          )}
          {harvestable.length === 0 && plantable.length === 0 && (
            <p className="text-muted-foreground">No major activities this month</p>
          )}
        </div>
      </div>
    </div>
  );
}
