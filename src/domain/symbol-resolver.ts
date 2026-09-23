import type { AssetClass, InstrumentSubtype, ResolvedSymbol } from "../types/index.js";
import { ADR_MAP, ADR_REVERSE, EXCHANGES, PHYSICAL_GOLD_ETPS, US_SUFFIXES } from "./exchanges.js";

const CRYPTO_ALIASES: Record<string, { base: string; name?: string }> = {
  BTC: { base: "BTC" },
  XBT: { base: "BTC" },
  BITCOIN: { base: "BTC" },
  ETH: { base: "ETH" },
  ETHER: { base: "ETH" },
  ETHEREUM: { base: "ETH" },
  SOL: { base: "SOL" },
  SOLANA: { base: "SOL" },
  XRP: { base: "XRP" },
  ADA: { base: "ADA" },
  DOGE: { base: "DOGE" },
  DOT: { base: "DOT" },
  AVAX: { base: "AVAX" },
  LINK: { base: "LINK" },
  MATIC: { base: "MATIC" },
  POL: { base: "POL" },
  BNB: { base: "BNB" },
  ATOM: { base: "ATOM" },
  LTC: { base: "LTC" },
  BCH: { base: "BCH" },
  UNI: { base: "UNI" },
  NEAR: { base: "NEAR" },
  APT: { base: "APT" },
  SUI: { base: "SUI" },
  TON: { base: "TON" },
  TRX: { base: "TRX" },
};

const CRYPTO_QUOTES = new Set(["USD", "USDT", "USDC", "EUR", "GBP", "JPY", "BTC", "ETH"]);

const BOND_ALIASES: Record<
  string,
  { ticker: string; country: string; currency: string; tenorYears: number; name: string }
> = {
  US10Y: { ticker: "US10Y", country: "US", currency: "USD", tenorYears: 10, name: "US 10Y Treasury" },
  US02Y: { ticker: "US02Y", country: "US", currency: "USD", tenorYears: 2, name: "US 2Y Treasury" },
  US2Y: { ticker: "US02Y", country: "US", currency: "USD", tenorYears: 2, name: "US 2Y Treasury" },
  US05Y: { ticker: "US05Y", country: "US", currency: "USD", tenorYears: 5, name: "US 5Y Treasury" },
  US5Y: { ticker: "US05Y", country: "US", currency: "USD", tenorYears: 5, name: "US 5Y Treasury" },
  US30Y: { ticker: "US30Y", country: "US", currency: "USD", tenorYears: 30, name: "US 30Y Treasury" },
  TNX: { ticker: "US10Y", country: "US", currency: "USD", tenorYears: 10, name: "US 10Y Treasury" },
  US10: { ticker: "US10Y", country: "US", currency: "USD", tenorYears: 10, name: "US 10Y Treasury" },
  BUND10Y: { ticker: "DE10Y", country: "DE", currency: "EUR", tenorYears: 10, name: "German Bund 10Y" },
  DE10Y: { ticker: "DE10Y", country: "DE", currency: "EUR", tenorYears: 10, name: "German Bund 10Y" },
  BUND: { ticker: "DE10Y", country: "DE", currency: "EUR", tenorYears: 10, name: "German Bund 10Y" },
  BONO10Y: { ticker: "ES10Y", country: "ES", currency: "EUR", tenorYears: 10, name: "Spanish Bono 10Y" },
  ES10Y: { ticker: "ES10Y", country: "ES", currency: "EUR", tenorYears: 10, name: "Spanish Bono 10Y" },
  BONO: { ticker: "ES10Y", country: "ES", currency: "EUR", tenorYears: 10, name: "Spanish Bono 10Y" },
  GILT10Y: { ticker: "GB10Y", country: "GB", currency: "GBP", tenorYears: 10, name: "UK Gilt 10Y" },
  GB10Y: { ticker: "GB10Y", country: "GB", currency: "GBP", tenorYears: 10, name: "UK Gilt 10Y" },
  JGB10Y: { ticker: "JP10Y", country: "JP", currency: "JPY", tenorYears: 10, name: "JGB 10Y" },
  JP10Y: { ticker: "JP10Y", country: "JP", currency: "JPY", tenorYears: 10, name: "JGB 10Y" },
  FR10Y: { ticker: "FR10Y", country: "FR", currency: "EUR", tenorYears: 10, name: "OAT 10Y" },
  OAT10Y: { ticker: "FR10Y", country: "FR", currency: "EUR", tenorYears: 10, name: "OAT 10Y" },
  IT10Y: { ticker: "IT10Y", country: "IT", currency: "EUR", tenorYears: 10, name: "BTP 10Y" },
  BTP10Y: { ticker: "IT10Y", country: "IT", currency: "EUR", tenorYears: 10, name: "BTP 10Y" },
};

const FX_METALS = new Set(["XAU", "XAG", "XPT", "XPD", "WTI", "BRENT", "NG"]);

const SHARE_CLASS_DOT = /^([A-Z0-9]{1,5})\.([A-Z])$/;

export class SymbolResolver {
  resolve(raw: string): ResolvedSymbol {
    const identifier = this.normalizeInput(raw);
    if (!identifier) {
      throw new Error("Empty identifier");
    }

    const bond = this.tryBond(identifier, raw);
    if (bond) return bond;

    const crypto = this.tryCrypto(identifier, raw);
    if (crypto) return crypto;

    const forex = this.tryForex(identifier, raw);
    if (forex) return forex;

    return this.resolveEquity(identifier, raw);
  }

  private normalizeInput(raw: string): string {
    return raw
      .trim()
      .replace(/^\$/, "")
      .replace(/\s+/g, "")
      .replace(/：/g, ":")
      .toUpperCase();
  }

  private tryBond(id: string, raw: string): ResolvedSymbol | null {
    const key = id.replace(/[./\-_]/g, "");
    const match = BOND_ALIASES[key];
    if (!match && !/^[A-Z]{2}\d{2}Y$/.test(key)) return null;
    const meta =
      match ??
      ({
        ticker: key,
        country: key.slice(0, 2),
        currency: key.startsWith("US") ? "USD" : "EUR",
        tenorYears: Number(key.slice(2, 4)),
        name: `${key.slice(0, 2)} ${key.slice(2, 4)}Y sovereign`,
      } as const);

    return this.base(raw, {
      canonicalTicker: meta.ticker,
      eodhdTicker: `${meta.ticker}.GBOND`,
      fmpTicker: meta.ticker,
      localTicker: meta.ticker,
      assetClass: "bond",
      instrumentSubtype: "sovereign_yield",
      exchange: "GBOND",
      exchangeName: "Sovereign yield curve",
      country: meta.country,
      listingCurrency: meta.currency,
      reportingCurrency: meta.currency,
      tenorYears: meta.tenorYears,
      notes: [meta.name],
    });
  }

  private tryCrypto(id: string, raw: string): ResolvedSymbol | null {
    const stripped = id.replace(/\.CC$/, "");
    const pair = this.splitPair(stripped);
    if (pair) {
      const baseAlias = CRYPTO_ALIASES[pair.base];
      if (baseAlias && CRYPTO_QUOTES.has(pair.quote)) {
        return this.cryptoSymbol(raw, baseAlias.base, pair.quote);
      }
    }

    if (CRYPTO_ALIASES[stripped]) {
      return this.cryptoSymbol(raw, CRYPTO_ALIASES[stripped]!.base, "USD");
    }
    return null;
  }

  private cryptoSymbol(raw: string, base: string, quote: string): ResolvedSymbol {
    const q = quote === "USDT" || quote === "USDC" ? "USD" : quote;
    return this.base(raw, {
      canonicalTicker: `${base}-${q}`,
      eodhdTicker: `${base}-${q}.CC`,
      fmpTicker: `${base}${q}`,
      localTicker: base,
      assetClass: "crypto",
      instrumentSubtype: "crypto_spot",
      exchange: "CC",
      exchangeName: "Crypto",
      listingCurrency: q,
      reportingCurrency: q,
      quotePair: { base, quote: q },
      notes: [`Spot ${base}/${q}`],
    });
  }

  private tryForex(id: string, raw: string): ResolvedSymbol | null {
    const stripped = id.replace(/\.(FOREX|FX|COMM)$/, "");
    const pair = this.splitPair(stripped);
    if (!pair) return null;
    const { base, quote } = pair;
    if (base.length !== 3 || quote.length !== 3) return null;
    if (CRYPTO_ALIASES[base]) return null;

    const isMetal = FX_METALS.has(base);
    const looksFx = /^[A-Z]{3}$/.test(base) && /^[A-Z]{3}$/.test(quote);
    if (!looksFx) return null;
    if (!isMetal && !this.isLikelyIsoCurrency(base) && !this.isLikelyIsoCurrency(quote)) {
      return null;
    }

    const joined = `${base}${quote}`;
    return this.base(raw, {
      canonicalTicker: `${base}/${quote}`,
      eodhdTicker: `${joined}.FOREX`,
      fmpTicker: joined,
      localTicker: joined,
      assetClass: "forex",
      instrumentSubtype: isMetal ? "commodity_spot" : "fx_spot",
      exchange: "FOREX",
      exchangeName: isMetal ? "Bullion / commodity" : "FX",
      listingCurrency: quote,
      reportingCurrency: quote,
      quotePair: { base, quote },
      notes: isMetal ? [`Physical ${base} vs ${quote}`] : [`FX ${base}/${quote}`],
    });
  }

  private resolveEquity(id: string, raw: string): ResolvedSymbol {
    const notes: string[] = [];
    let working = id;
    const micPrefix = working.match(/^([A-Z]{4}):(.+)$/);
    const micToExchange: Record<string, string> = {
      XETR: "DE",
      BMEX: "MC",
      XLON: "L",
      XTKS: "T",
      XHKG: "HK",
      XNAS: "US",
      XNYS: "US",
      XTAI: "TW",
    };
    if (micPrefix && micToExchange[micPrefix[1]!]) {
      const exCode = micToExchange[micPrefix[1]!]!;
      working = exCode === "US" ? micPrefix[2]! : `${micPrefix[2]}.${exCode}`;
    }

    working = working.replace(/:(US|NYSE|NASDAQ)$/, ".US");

    let { ticker, suffix } = this.splitExchange(working);

    if (SHARE_CLASS_DOT.test(working) && !suffix) {
      const m = working.match(SHARE_CLASS_DOT);
      if (m) {
        ticker = `${m[1]}.${m[2]}`;
        suffix = "US";
        notes.push("US share-class ticker (dot notation, e.g. BRK.B)");
      }
    }

    ticker = ticker.replace(/-/g, ".");
    if (/^[A-Z]{1,5}\.[A-Z]$/.test(ticker) && (!suffix || US_SUFFIXES.has(suffix))) {
      suffix = "US";
    }

    if (!suffix) {
      suffix = "US";
      notes.push("Bare ticker assumed NYSE/NASDAQ");
    }

    const ex = EXCHANGES[suffix] ?? {
      code: suffix,
      name: suffix,
      country: "UN",
      currency: "USD",
    };

    const eodhdLocal = ticker.replace(/\./g, "-");
    const fmpTicker = suffix === "US" ? ticker : `${ticker}.${ex.code}`;
    const eodhdTicker = `${eodhdLocal}.${ex.code === "US" ? "US" : ex.code}`;
    const canonical = suffix === "US" ? ticker : `${ticker}.${ex.code}`;

    const isGoldEtp = PHYSICAL_GOLD_ETPS.has(canonical) || PHYSICAL_GOLD_ETPS.has(`${ticker}.${ex.code}`);
    const adr = ADR_MAP[canonical] ?? ADR_MAP[`${ticker}.${ex.code}`];
    const reverse = ADR_REVERSE[`${eodhdLocal}.US`] ?? ADR_REVERSE[`${ticker}.US`];

    const quoteScale = ex.quoteScale ?? (ex.currency === "GBX" ? 100 : 1);
    const quoteCurrencyNormalized =
      ex.quoteCurrencyNormalized ?? (ex.currency === "GBX" ? "GBP" : ex.currency);

    if (quoteScale === 100) {
      notes.push("LSE quotation in GBX (pence): prices divided by 100 to GBP");
    }
    if (adr) {
      notes.push(`USD ADR available: ${adr.adr} (${adr.name})`);
    }
    if (reverse) {
      notes.push(`Local listing: ${reverse}`);
    }
    if (isGoldEtp) {
      notes.push("Physical gold ETP — listed equity with bullion underlying");
    }

    return this.base(raw, {
      canonicalTicker: canonical,
      eodhdTicker,
      fmpTicker,
      localTicker: ticker,
      assetClass: "equity",
      instrumentSubtype: isGoldEtp ? "physical_etp" : reverse ? "adr" : "common_stock",
      exchange: ex.code,
      exchangeName: ex.name,
      mic: ex.mic,
      country: ex.country,
      listingCurrency: ex.currency,
      reportingCurrency: ex.currency === "GBX" ? "GBP" : ex.currency,
      quoteScale,
      quoteCurrencyNormalized,
      isAdr: Boolean(reverse),
      adrUnderlying: reverse,
      adrTicker: adr?.adr,
      notes,
    });
  }

  private splitExchange(id: string): { ticker: string; suffix?: string } {
    const colon = id.match(/^([A-Z0-9.-]+):([A-Z0-9]{1,6})$/);
    if (colon) {
      return { ticker: colon[1]!, suffix: colon[2] };
    }
    const lastDot = id.lastIndexOf(".");
    if (lastDot > 0 && lastDot < id.length - 1) {
      const suffix = id.slice(lastDot + 1);
      const ticker = id.slice(0, lastDot);
      if (EXCHANGES[suffix] || US_SUFFIXES.has(suffix) || suffix.length <= 4) {
        if (EXCHANGES[suffix] || US_SUFFIXES.has(suffix)) {
          return { ticker, suffix };
        }
        if (/^[A-Z]$/.test(suffix) && ticker.length <= 5) {
          return { ticker: id, suffix: undefined };
        }
      }
    }
    return { ticker: id, suffix: undefined };
  }

  private splitPair(id: string): { base: string; quote: string } | null {
    const seps = id.split(/[/\-_]/);
    if (seps.length === 2 && seps[0] && seps[1]) {
      return { base: seps[0], quote: seps[1] };
    }
    if (/^[A-Z]{6}$/.test(id)) {
      return { base: id.slice(0, 3), quote: id.slice(3) };
    }
    if (/^[A-Z]{3}USD$/.test(id) || /^[A-Z]{3}EUR$/.test(id)) {
      return { base: id.slice(0, 3), quote: id.slice(3) };
    }
    return null;
  }

  private isLikelyIsoCurrency(code: string): boolean {
    return [
      "USD",
      "EUR",
      "GBP",
      "JPY",
      "CHF",
      "AUD",
      "CAD",
      "NZD",
      "SEK",
      "NOK",
      "DKK",
      "CNH",
      "CNY",
      "HKD",
      "SGD",
      "KRW",
      "INR",
      "BRL",
      "MXN",
      "ZAR",
      "TRY",
      "PLN",
      "HUF",
      "CZK",
      "ILS",
      "THB",
      "TWD",
    ].includes(code);
  }

  private base(
    raw: string,
    partial: Omit<ResolvedSymbol, "rawIdentifier" | "quoteScale" | "quoteCurrencyNormalized" | "isAdr" | "notes"> &
      Partial<Pick<ResolvedSymbol, "quoteScale" | "quoteCurrencyNormalized" | "isAdr" | "notes" | "mic" | "quotePair" | "adrUnderlying" | "adrTicker" | "tenorYears">>,
  ): ResolvedSymbol {
    return {
      rawIdentifier: raw,
      quoteScale: 1,
      quoteCurrencyNormalized: partial.listingCurrency,
      isAdr: false,
      notes: [],
      ...partial,
    };
  }
}

export const symbolResolver = new SymbolResolver();
