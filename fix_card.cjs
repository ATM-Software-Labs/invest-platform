const fs = require('fs');

let content = fs.readFileSync('web/components/CompanyCard.tsx', 'utf8');

const replacement = `<span className="mt-0.5 block truncate font-mono text-[11px] tabular-nums text-zinc-500">
              <a
                href={\`https://www.tradingview.com/chart/?symbol=\${id.endsWith('.MC') ? 'BME:' + id.replace('.MC', '') : id.endsWith('.DE') ? 'XETR:' + id.replace('.DE', '') : id.endsWith('.PA') ? 'EURONEXT:' + id.replace('.PA', '') : id.endsWith('.AS') ? 'EURONEXT:' + id.replace('.AS', '') : id.endsWith('.L') ? 'LSE:' + id.replace('.L', '') : id.endsWith('.MI') ? 'MIL:' + id.replace('.MI', '') : id}\`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline cursor-pointer hover:text-blue-400 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {id}
              </a>
              {meta ? <span className="hidden text-zinc-600 sm:inline"> · {meta}</span> : null}
            </span>`;

content = content.replace(/<span className="mt-0\.5 block truncate font-mono text-\[11px\] tabular-nums text-zinc-500">[\s\S]*?<\/span>/m, replacement);

fs.writeFileSync('web/components/CompanyCard.tsx', content);

console.log('Fixed CompanyCard');
