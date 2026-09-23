const fs = require('fs');

let content = fs.readFileSync('web/components/TerminalHome.tsx', 'utf8');

// 1. Inject live quotes fetching
const liveQuotesEffect = `
  const [liveQuotes, setLiveQuotes] = useState<Record<string, { price: number; changePercent: number; currency: string }>>({});

  useEffect(() => {
    if (!board) return;
    const tickers = [...new Set([...(board.mesa || []).map(r => r.id), ...(board.assets || []).map(r => r.id)])].join(',');
    if (!tickers) return;
    fetch(\`/api/v1/quotes?tickers=\${tickers}\`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) setLiveQuotes(data);
      })
      .catch(console.error);
  }, [board]);

  const quoteById = useMemo(() => {
    const map = new Map<string, any>();
    for (const row of board?.mesa ?? []) map.set(row.id.toUpperCase(), { ...row, ...liveQuotes[row.id] });
    for (const row of board?.assets ?? []) map.set(row.id.toUpperCase(), { ...row, ...liveQuotes[row.id] });
    return map;
  }, [board, liveQuotes]);
`;

content = content.replace(/const quoteById = useMemo\(\(\) => \{[\s\S]*?\}, \[board\]\);/m, liveQuotesEffect);

// 2. Inject Onboarding state
const onboardingState = `
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [qMarket, setQMarket] = useState("");
  const [qStyle, setQStyle] = useState("");
  const [qSector, setQSector] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const done = localStorage.getItem("invest_onboarding");
      if (done) setOnboardingDone(true);
    }
  }, []);

  const completeOnboarding = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("invest_onboarding", "true");
    }
    setOnboardingDone(true);
    
    // Auto-filter based on answers (basic matching for the requested functionality)
    if (qMarket === "España") setCountry("ES");
    if (qMarket === "EE.UU.") setCountry("US");
    if (qSector === "Tecnología") setSector("Tecnología");
    if (qSector === "Financiero/Energía") setSector("Financiero"); // Approximation
  };
`;

content = content.replace(/const \[mesa, setMesa\] = useState<MesaItem\[\]>\(DEFAULT_MESA\);/m, `const [mesa, setMesa] = useState<MesaItem[]>(DEFAULT_MESA);\n${onboardingState}`);

// 3. Inject Onboarding UI
const onboardingUI = `
      {!onboardingDone ? (
        <div className="mb-10 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold text-zinc-100">Configura tu Perfil de Inversión</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm text-zinc-400">1. ¿Mercado preferido?</label>
              <select value={qMarket} onChange={(e) => setQMarket(e.target.value)} className="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-sm text-zinc-200 outline-none">
                <option value="">Selecciona...</option>
                <option value="España">España</option>
                <option value="Europa">Europa</option>
                <option value="EE.UU.">EE.UU.</option>
                <option value="Global">Global</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-zinc-400">2. ¿Estilo de inversión?</label>
              <select value={qStyle} onChange={(e) => setQStyle(e.target.value)} className="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-sm text-zinc-200 outline-none">
                <option value="">Selecciona...</option>
                <option value="Calidad">Calidad/Buffett</option>
                <option value="Dividendos">Dividendos</option>
                <option value="Crecimiento">Crecimiento/Tech</option>
                <option value="Valor">Valor Profundo</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-zinc-400">3. ¿Sector de interés?</label>
              <select value={qSector} onChange={(e) => setQSector(e.target.value)} className="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-sm text-zinc-200 outline-none">
                <option value="">Selecciona...</option>
                <option value="Defensa">Defensa/Industria</option>
                <option value="Tecnología">Tecnología</option>
                <option value="Financiero/Energía">Financiero/Energía</option>
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button onClick={completeOnboarding} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500">Ver Recomendaciones</button>
          </div>
        </div>
      ) : null}

      {onboardingDone && !showFull ? (
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-zinc-400">Mostrando selección destacada basada en tu perfil.</p>
          <button onClick={() => setShowFull(true)} className="text-sm text-blue-400 hover:underline">Explorar universo completo (50+)</button>
        </div>
      ) : null}
`;

content = content.replace(/<header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">/m, `${onboardingUI}\n      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">`);

// 4. Update the mapping logic to only show 3 or 4 cards if !showFull
const filterCardsUI = `
            {list.slice(0, (!showFull && onboardingDone) ? 4 : list.length).map((row) => {
`;

content = content.replace(/\{list\.map\(\(row\) => \{/m, filterCardsUI);

fs.writeFileSync('web/components/TerminalHome.tsx', content);

console.log('Fixed TerminalHome.tsx');
