const fs = require('fs');
let c = fs.readFileSync('web/components/StyleAffinityPanel.tsx', 'utf8');
const replacement = `  const totalAffinity = Object.values(archetypes).reduce((acc, a) => acc + (a?.affinity || 0), 0);
  
  if (totalAffinity === 0) {
    return (
      <Panel>
        <div className="mb-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">Afinidad</p>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500"></div>
          <p className="text-sm font-medium text-slate-300">Calculando ratios...</p>
          <p className="mt-1 text-xs text-slate-500">Evaluando métricas para estilos de inversión</p>
        </div>
      </Panel>
    );
  }

  return (`;
c = c.replace('  return (', replacement);
fs.writeFileSync('web/components/StyleAffinityPanel.tsx', c);
