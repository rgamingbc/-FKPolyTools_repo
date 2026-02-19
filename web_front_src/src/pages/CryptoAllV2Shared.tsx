import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Checkbox, InputNumber, Modal, Select, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useAccountApiPath } from '../api/apiPath';

const { Title } = Typography;

const api = axios.create({
    baseURL: '/api',
    timeout: 120000,
});

const SYMBOL_OPTIONS = [
    { label: 'BTC', value: 'BTC' },
    { label: 'ETH', value: 'ETH' },
    { label: 'SOL', value: 'SOL' },
    { label: 'XRP', value: 'XRP' },
];

const TF_OPTIONS = [
    { label: '5m', value: '5m' },
    { label: '15m', value: '15m' },
    { label: '1h', value: '1h' },
    { label: '4h', value: '4h' },
    { label: '1d', value: '1d' },
];

export default function CryptoAllV2Shared(props: { strategy: 'cryptoall' | 'cryptoall2'; title: string; storageKey: string }) {
    const { strategy, title, storageKey } = props;
    const apiPath = useAccountApiPath();
    const accountScopeKey = useMemo(() => apiPath('/'), [apiPath]);
    const scopedStorageKey = useMemo(() => `${storageKey}:${accountScopeKey}`, [storageKey, accountScopeKey]);
    const timeframeOptions = useMemo(() => {
        if (strategy === 'cryptoall2') return TF_OPTIONS.filter((t) => t.value === '5m' || t.value === '15m');
        return TF_OPTIONS.filter((t) => t.value === '15m');
    }, [strategy]);
    const abortersRef = useRef<Map<string, AbortController>>(new Map());
    const apiGet = useCallback((key: string, p: string, config?: any) => {
        const prev = abortersRef.current.get(key);
        if (prev) prev.abort();
        const controller = new AbortController();
        abortersRef.current.set(key, controller);
        return api.get(apiPath(p), { ...(config || {}), signal: controller.signal }).finally(() => {
            const cur = abortersRef.current.get(key);
            if (cur === controller) abortersRef.current.delete(key);
        });
    }, [apiPath]);
    const apiPost = useCallback((key: string, p: string, data?: any, config?: any) => {
        const prev = abortersRef.current.get(key);
        if (prev) prev.abort();
        const controller = new AbortController();
        abortersRef.current.set(key, controller);
        return api.post(apiPath(p), data, { ...(config || {}), signal: controller.signal }).finally(() => {
            const cur = abortersRef.current.get(key);
            if (cur === controller) abortersRef.current.delete(key);
        });
    }, [apiPath]);
    const [candidates, setCandidates] = useState<any[]>([]);
    const [status, setStatus] = useState<any>(null);
    const [watchdog, setWatchdog] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [configEvents, setConfigEvents] = useState<any[]>([]);
    const [historySummary, setHistorySummary] = useState<any>(null);
    const [stoplossOpen, setStoplossOpen] = useState(false);
    const [stoplossHistory, setStoplossHistory] = useState<any[]>([]);
    const [stoplossSummary, setStoplossSummary] = useState<any>(null);
    const [stoplossLoading, setStoplossLoading] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportText, setReportText] = useState<string>('');
    const [bidLoadingId, setBidLoadingId] = useState<string | null>(null);
    const [refreshLoading, setRefreshLoading] = useState(false);
    const [startLoading, setStartLoading] = useState(false);
    const [stopLoading, setStopLoading] = useState(false);
    const [watchdogStartLoading, setWatchdogStartLoading] = useState(false);
    const [watchdogStopLoading, setWatchdogStopLoading] = useState(false);
    const [, setThresholdsLoading] = useState(false);
    const [thresholdsSaving, setThresholdsSaving] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [pollMs, setPollMs] = useState<number>(4000);
    const [minProb, setMinProb] = useState<number>(0.9);
    const [expiresWithinSec, setExpiresWithinSec] = useState<number>(180);
    const [expiresWithinSecByTimeframe, setExpiresWithinSecByTimeframe] = useState<Record<string, number>>({ '5m': 180, '15m': 180, '1h': 180, '4h': 180, '1d': 180 });
    const [amountUsd, setAmountUsd] = useState<number>(1);
    const [splitBuyEnabled, setSplitBuyEnabled] = useState<boolean>(false);
    const [splitBuyPct3m, setSplitBuyPct3m] = useState<number>(34);
    const [splitBuyPct2m, setSplitBuyPct2m] = useState<number>(33);
    const [splitBuyPct1m, setSplitBuyPct1m] = useState<number>(33);
    const [splitBuyTrendEnabled, setSplitBuyTrendEnabled] = useState<boolean>(true);
    const [splitBuyTrendMinutes3m, setSplitBuyTrendMinutes3m] = useState<number>(3);
    const [splitBuyTrendMinutes2m, setSplitBuyTrendMinutes2m] = useState<number>(2);
    const [splitBuyTrendMinutes1m, setSplitBuyTrendMinutes1m] = useState<number>(1);
    const [btcMinDelta, setBtcMinDelta] = useState<number>(600);
    const [ethMinDelta, setEthMinDelta] = useState<number>(30);
    const [solMinDelta, setSolMinDelta] = useState<number>(0.8);
    const [xrpMinDelta, setXrpMinDelta] = useState<number>(0.0065);
    const [symbols, setSymbols] = useState<string[]>(['BTC', 'ETH', 'SOL', 'XRP']);
    const [timeframes, setTimeframes] = useState<string[]>(strategy === 'cryptoall2' ? ['15m'] : ['15m']);
    const [showSkipped, setShowSkipped] = useState(false);
    const [dojiGuardEnabled, setDojiGuardEnabled] = useState<boolean>(true);
    const [riskSkipScore, setRiskSkipScore] = useState<number>(70);
    const [riskAddOnBlockScore, setRiskAddOnBlockScore] = useState<number>(50);
    const [deltaSyncMode, setDeltaSyncMode] = useState<'cryptoall2_base' | 'crypto15m_base' | 'max'>('cryptoall2_base');
    const [adaptiveDeltaSync, setAdaptiveDeltaSync] = useState<boolean>(false);

    const [stoplossEnabled, setStoplossEnabled] = useState<boolean>(false);
    const [stoplossCut1DropCents, setStoplossCut1DropCents] = useState<number>(1);
    const [stoplossCut1SellPct, setStoplossCut1SellPct] = useState<number>(50);
    const [stoplossCut2DropCents, setStoplossCut2DropCents] = useState<number>(2);
    const [stoplossCut2SellPct, setStoplossCut2SellPct] = useState<number>(100);
    const [stoplossMinSecToExit, setStoplossMinSecToExit] = useState<number>(25);
    const [adaptiveDeltaEnabled, setAdaptiveDeltaEnabled] = useState<boolean>(true);
    const [adaptiveDeltaBigMoveMultiplier, setAdaptiveDeltaBigMoveMultiplier] = useState<number>(2);
    const [adaptiveDeltaRevertNoBuyCount, setAdaptiveDeltaRevertNoBuyCount] = useState<number>(4);
    const [matrixOpen, setMatrixOpen] = useState(false);
    const [deltaBoxOpen, setDeltaBoxOpen] = useState(false);
    const [deltaBoxLoading, setDeltaBoxLoading] = useState(false);
    const [deltaBoxData, setDeltaBoxData] = useState<any>(null);
    const [deltaBoxAutoConfirmEnabled, setDeltaBoxAutoConfirmEnabled] = useState(false);
    const [deltaBoxAutoConfirmMinIntervalSec, setDeltaBoxAutoConfirmMinIntervalSec] = useState<number>(60);
    const [deltaBoxAutoConfirmMinChangePct, setDeltaBoxAutoConfirmMinChangePct] = useState<number>(5);
    const [deltaBoxApplyBySymbol, setDeltaBoxApplyBySymbol] = useState<Record<string, { enabled: boolean; timeframe: '5m' | '15m'; n: 10 | 20 | 50; pct: number }>>({
        BTC: { enabled: true, timeframe: '15m', n: 20, pct: 100 },
        ETH: { enabled: true, timeframe: '15m', n: 20, pct: 100 },
        SOL: { enabled: true, timeframe: '15m', n: 20, pct: 100 },
        XRP: { enabled: true, timeframe: '15m', n: 20, pct: 100 },
    });
    const [settingsHydrated, setSettingsHydrated] = useState(false);
    const deltaBoxLastAutoAtRef = useRef<number>(0);

    const timerRef = useRef<any>(null);
    const candidatesSigRef = useRef<string>('');

    useEffect(() => {
        setSettingsHydrated(false);
        setMinProb(0.9);
        setExpiresWithinSec(180);
        setExpiresWithinSecByTimeframe({ '5m': 180, '15m': 180, '1h': 180, '4h': 180, '1d': 180 });
        setAmountUsd(1);
        setSplitBuyEnabled(false);
        setSplitBuyPct3m(34);
        setSplitBuyPct2m(33);
        setSplitBuyPct1m(33);
        setSplitBuyTrendEnabled(true);
        setSplitBuyTrendMinutes3m(3);
        setSplitBuyTrendMinutes2m(2);
        setSplitBuyTrendMinutes1m(1);
        setPollMs(4000);
        setSymbols(['BTC', 'ETH', 'SOL', 'XRP']);
        setTimeframes(strategy === 'cryptoall2' ? ['15m'] : ['15m']);
        setShowSkipped(false);
        setDojiGuardEnabled(true);
        setRiskSkipScore(70);
        setRiskAddOnBlockScore(50);
        setDeltaSyncMode('cryptoall2_base');
        setAdaptiveDeltaSync(false);
        setBtcMinDelta(600);
        setEthMinDelta(30);
        setSolMinDelta(0.8);
        setXrpMinDelta(0.0065);
        setAutoRefresh(true);
        setStoplossEnabled(false);
        setStoplossCut1DropCents(1);
        setStoplossCut1SellPct(50);
        setStoplossCut2DropCents(2);
        setStoplossCut2SellPct(100);
        setStoplossMinSecToExit(25);
        setAdaptiveDeltaEnabled(true);
        setAdaptiveDeltaBigMoveMultiplier(2);
        setAdaptiveDeltaRevertNoBuyCount(4);
        setDeltaBoxOpen(false);
        setDeltaBoxData(null);
        setDeltaBoxAutoConfirmEnabled(false);
        setDeltaBoxAutoConfirmMinIntervalSec(60);
        setDeltaBoxAutoConfirmMinChangePct(5);
        setDeltaBoxApplyBySymbol({
            BTC: { enabled: true, timeframe: '15m', n: 20, pct: 100 },
            ETH: { enabled: true, timeframe: '15m', n: 20, pct: 100 },
            SOL: { enabled: true, timeframe: '15m', n: 20, pct: 100 },
            XRP: { enabled: true, timeframe: '15m', n: 20, pct: 100 },
        });
        try {
            const raw = localStorage.getItem(scopedStorageKey) || localStorage.getItem(storageKey);
            if (!raw) return;
            if (!localStorage.getItem(scopedStorageKey) && localStorage.getItem(storageKey)) {
                try { localStorage.setItem(scopedStorageKey, raw); } catch {}
            }
            const parsed = JSON.parse(raw);
            if (parsed?.minProb != null) setMinProb(Number(parsed.minProb));
            if (parsed?.expiresWithinSec != null) setExpiresWithinSec(Number(parsed.expiresWithinSec));
            if (parsed?.expiresWithinSecByTimeframe && typeof parsed.expiresWithinSecByTimeframe === 'object') {
                const e = parsed.expiresWithinSecByTimeframe;
                setExpiresWithinSecByTimeframe({
                    '5m': e['5m'] != null ? Number(e['5m']) : 180,
                    '15m': e['15m'] != null ? Number(e['15m']) : 180,
                    '1h': e['1h'] != null ? Number(e['1h']) : 180,
                    '4h': e['4h'] != null ? Number(e['4h']) : 180,
                    '1d': e['1d'] != null ? Number(e['1d']) : 180,
                });
            }
            if (parsed?.amountUsd != null) setAmountUsd(Number(parsed.amountUsd));
            if (parsed?.splitBuyEnabled != null) setSplitBuyEnabled(!!parsed.splitBuyEnabled);
            if (parsed?.splitBuyPct3m != null) setSplitBuyPct3m(Number(parsed.splitBuyPct3m));
            if (parsed?.splitBuyPct2m != null) setSplitBuyPct2m(Number(parsed.splitBuyPct2m));
            if (parsed?.splitBuyPct1m != null) setSplitBuyPct1m(Number(parsed.splitBuyPct1m));
            if (parsed?.splitBuyTrendEnabled != null) setSplitBuyTrendEnabled(!!parsed.splitBuyTrendEnabled);
            if (parsed?.splitBuyTrendMinutes3m != null) setSplitBuyTrendMinutes3m(Number(parsed.splitBuyTrendMinutes3m));
            if (parsed?.splitBuyTrendMinutes2m != null) setSplitBuyTrendMinutes2m(Number(parsed.splitBuyTrendMinutes2m));
            if (parsed?.splitBuyTrendMinutes1m != null) setSplitBuyTrendMinutes1m(Number(parsed.splitBuyTrendMinutes1m));
            if (parsed?.pollMs != null) setPollMs(Number(parsed.pollMs));
            if (Array.isArray(parsed?.symbols)) setSymbols(parsed.symbols.map((x: any) => String(x || '').toUpperCase()).filter(Boolean));
            if (Array.isArray(parsed?.timeframes)) {
                const raw = parsed.timeframes.map((x: any) => String(x || '').toLowerCase()).filter(Boolean);
                const next =
                    strategy === 'cryptoall2'
                        ? raw.filter((t: string) => t === '5m' || t === '15m')
                        : raw.filter((t: string) => t === '15m');
                setTimeframes(next.length ? next : (strategy === 'cryptoall2' ? ['15m'] : ['15m']));
            }
            if (parsed?.showSkipped != null) setShowSkipped(!!parsed.showSkipped);
            if (parsed?.dojiGuardEnabled != null) setDojiGuardEnabled(!!parsed.dojiGuardEnabled);
            if (parsed?.riskSkipScore != null) setRiskSkipScore(Number(parsed.riskSkipScore));
            if (parsed?.riskAddOnBlockScore != null) setRiskAddOnBlockScore(Number(parsed.riskAddOnBlockScore));
            if (parsed?.deltaSyncMode != null) setDeltaSyncMode(String(parsed.deltaSyncMode) === 'crypto15m_base' ? 'crypto15m_base' : String(parsed.deltaSyncMode) === 'max' ? 'max' : 'cryptoall2_base');
            if (parsed?.adaptiveDeltaSync != null) setAdaptiveDeltaSync(!!parsed.adaptiveDeltaSync);
            if (parsed?.btcMinDelta != null) setBtcMinDelta(Number(parsed.btcMinDelta));
            if (parsed?.ethMinDelta != null) setEthMinDelta(Number(parsed.ethMinDelta));
            if (parsed?.solMinDelta != null) setSolMinDelta(Number(parsed.solMinDelta));
            if (parsed?.xrpMinDelta != null) setXrpMinDelta(Number(parsed.xrpMinDelta));
            if (parsed?.autoRefresh != null) setAutoRefresh(!!parsed.autoRefresh);
            if (parsed?.stoplossEnabled != null) setStoplossEnabled(!!parsed.stoplossEnabled);
            if (parsed?.stoplossCut1DropCents != null) setStoplossCut1DropCents(Number(parsed.stoplossCut1DropCents));
            if (parsed?.stoplossCut1SellPct != null) setStoplossCut1SellPct(Number(parsed.stoplossCut1SellPct));
            if (parsed?.stoplossCut2DropCents != null) setStoplossCut2DropCents(Number(parsed.stoplossCut2DropCents));
            if (parsed?.stoplossCut2SellPct != null) setStoplossCut2SellPct(Number(parsed.stoplossCut2SellPct));
            if (parsed?.stoplossMinSecToExit != null) setStoplossMinSecToExit(Number(parsed.stoplossMinSecToExit));
            if (parsed?.adaptiveDeltaEnabled != null) setAdaptiveDeltaEnabled(!!parsed.adaptiveDeltaEnabled);
            if (parsed?.adaptiveDeltaBigMoveMultiplier != null) setAdaptiveDeltaBigMoveMultiplier(Number(parsed.adaptiveDeltaBigMoveMultiplier));
            if (parsed?.adaptiveDeltaRevertNoBuyCount != null) setAdaptiveDeltaRevertNoBuyCount(Number(parsed.adaptiveDeltaRevertNoBuyCount));
            if (parsed?.deltaBoxAutoConfirmEnabled != null) setDeltaBoxAutoConfirmEnabled(!!parsed.deltaBoxAutoConfirmEnabled);
            if (parsed?.deltaBoxAutoConfirmMinIntervalSec != null) setDeltaBoxAutoConfirmMinIntervalSec(Math.max(5, Math.floor(Number(parsed.deltaBoxAutoConfirmMinIntervalSec) || 60)));
            if (parsed?.deltaBoxAutoConfirmMinChangePct != null) setDeltaBoxAutoConfirmMinChangePct(Math.max(0, Math.min(100, Number(parsed.deltaBoxAutoConfirmMinChangePct) || 5)));
            if (strategy === 'cryptoall2' && parsed?.deltaBoxApplyBySymbol && typeof parsed.deltaBoxApplyBySymbol === 'object') {
                const by = parsed.deltaBoxApplyBySymbol as any;
                const next: any = {};
                for (const sym of ['BTC', 'ETH', 'SOL', 'XRP']) {
                    const raw = by?.[sym] || {};
                    const enabled = raw?.enabled === true;
                    const tf = String(raw?.timeframe || '15m').toLowerCase();
                    const timeframe = (tf === '5m' ? '5m' : '15m') as '5m' | '15m';
                    const n = raw?.n === 10 ? 10 : raw?.n === 50 ? 50 : 20;
                    const pct = Math.max(0, Math.min(500, Number(raw?.pct) || 100));
                    next[sym] = { enabled, timeframe, n, pct };
                }
                setDeltaBoxApplyBySymbol(next);
            }
        } catch {
        } finally {
            setSettingsHydrated(true);
        }
    }, [scopedStorageKey, storageKey, strategy]);

    useEffect(() => {
        if (!settingsHydrated) return;
        try {
            localStorage.setItem(scopedStorageKey, JSON.stringify({
                minProb,
                expiresWithinSec,
                expiresWithinSecByTimeframe,
                amountUsd,
                splitBuyEnabled,
                splitBuyPct3m,
                splitBuyPct2m,
                splitBuyPct1m,
                splitBuyTrendEnabled,
                splitBuyTrendMinutes3m,
                splitBuyTrendMinutes2m,
                splitBuyTrendMinutes1m,
                pollMs,
                symbols,
                timeframes,
                showSkipped,
                dojiGuardEnabled,
                riskSkipScore,
                riskAddOnBlockScore,
                deltaSyncMode,
                adaptiveDeltaSync,
                btcMinDelta,
                ethMinDelta,
                solMinDelta,
                xrpMinDelta,
                autoRefresh,
                stoplossEnabled,
                stoplossCut1DropCents,
                stoplossCut1SellPct,
                stoplossCut2DropCents,
                stoplossCut2SellPct,
                stoplossMinSecToExit,
                adaptiveDeltaEnabled,
                adaptiveDeltaBigMoveMultiplier,
                adaptiveDeltaRevertNoBuyCount,
                deltaBoxAutoConfirmEnabled,
                deltaBoxAutoConfirmMinIntervalSec,
                deltaBoxAutoConfirmMinChangePct,
                deltaBoxApplyBySymbol,
            }));
        } catch {
        }
    }, [settingsHydrated, scopedStorageKey, minProb, expiresWithinSec, expiresWithinSecByTimeframe, amountUsd, splitBuyEnabled, splitBuyPct3m, splitBuyPct2m, splitBuyPct1m, splitBuyTrendEnabled, splitBuyTrendMinutes3m, splitBuyTrendMinutes2m, splitBuyTrendMinutes1m, pollMs, symbols, timeframes, showSkipped, dojiGuardEnabled, riskSkipScore, riskAddOnBlockScore, deltaSyncMode, adaptiveDeltaSync, btcMinDelta, ethMinDelta, solMinDelta, xrpMinDelta, autoRefresh, stoplossEnabled, stoplossCut1DropCents, stoplossCut1SellPct, stoplossCut2DropCents, stoplossCut2SellPct, stoplossMinSecToExit, adaptiveDeltaEnabled, adaptiveDeltaBigMoveMultiplier, adaptiveDeltaRevertNoBuyCount, deltaBoxAutoConfirmEnabled, deltaBoxAutoConfirmMinIntervalSec, deltaBoxAutoConfirmMinChangePct, deltaBoxApplyBySymbol]);

    const autoSummary = useMemo(() => {
        const parts = [
            status?.enabled === true ? 'AUTO=ON' : 'AUTO=OFF',
            `poll=${pollMs}ms`,
            `minProb=${minProb}`,
            `exp≤${expiresWithinSec}s`,
            `usd=${amountUsd}`,
            `symbols=${(symbols || []).join(',')}`,
            `tfs=${(timeframes || []).join(',')}`,
            splitBuyEnabled ? `split=ON(${splitBuyPct3m}/${splitBuyPct2m}/${splitBuyPct1m})` : 'split=OFF',
            dojiGuardEnabled ? `doji=ON(skip≥${riskSkipScore},block≥${riskAddOnBlockScore})` : 'doji=OFF',
            stoplossEnabled != null ? `stoploss=${stoplossEnabled ? 'ON' : 'OFF'}` : null,
            adaptiveDeltaEnabled != null ? `adaptiveΔ=${adaptiveDeltaEnabled ? 'ON' : 'OFF'}` : null,
        ].filter(Boolean);
        return parts.join(' • ');
    }, [status, pollMs, minProb, expiresWithinSec, amountUsd, symbols, timeframes, splitBuyEnabled, splitBuyPct3m, splitBuyPct2m, splitBuyPct1m, dojiGuardEnabled, riskSkipScore, riskAddOnBlockScore, stoplossEnabled, adaptiveDeltaEnabled]);

    const fetchStatus = async () => {
        const res = await apiGet('status', `/group-arb/${strategy}/status`);
        const data = res.data || null;
        setStatus(data?.status ?? data);
    };

    const fetchWatchdog = async () => {
        const r = await apiGet('watchdog', '/group-arb/crypto15m/watchdog/status');
        const data = r.data || null;
        setWatchdog(data?.status ?? data);
    };

    const onOpenReport = async () => {
        setReportOpen(true);
        setReportLoading(true);
        try {
            const r = await apiGet('report', '/group-arb/crypto15m/watchdog/report/latest');
            const md = r.data?.md ?? '';
            const json = r.data?.json ?? null;
            setReportText(md || (json ? JSON.stringify(json, null, 2) : ''));
        } finally {
            setReportLoading(false);
        }
    };

    const fetchCandidates = async () => {
        const tfList = (timeframes && timeframes.length ? timeframes : ['15m'])
            .map((x) => String(x || '').toLowerCase())
            .filter(Boolean);
        const expiresJson = JSON.stringify(expiresWithinSecByTimeframe || {});
        const res = await apiGet('candidates', `/group-arb/${strategy}/candidates`, {
            params: {
                symbols: symbols.join(','),
                timeframes: tfList.join(','),
                minProb,
                expiresWithinSec,
                expiresWithinSecByTimeframeJson: expiresJson,
                limit: 40,
            }
        });
        const list = Array.isArray(res.data?.candidates) ? res.data.candidates : [];
        const sig = (list || []).slice(0, 120).map((c: any) => `${c?.conditionId || ''}|${c?.timeframe || ''}|${c?.secondsToExpire ?? ''}|${c?.upPrice ?? ''}|${c?.downPrice ?? ''}|${c?.chosenOutcome ?? ''}|${c?.chosenPrice ?? ''}|${c?.riskState ?? ''}|${c?.riskScore ?? ''}`).join(';');
        if (candidatesSigRef.current !== sig) {
            candidatesSigRef.current = sig;
            setCandidates(list);
        }
    };

    const matrixRows = useMemo(() => {
        const list = Array.isArray(candidates) ? candidates : [];
        const byKey = new Map<string, any>();
        for (const c of list) {
            const sym = String(c?.symbol || '').toUpperCase();
            const tf = String(c?.timeframe || '15m');
            if (!sym) continue;
            const key = `${sym}:${tf}`;
            const prev = byKey.get(key);
            const sec = Number(c?.secondsToExpire);
            const prevSec = prev?.secondsToExpire != null ? Number(prev.secondsToExpire) : NaN;
            if (!prev || (Number.isFinite(sec) && (!Number.isFinite(prevSec) || sec < prevSec))) {
                byKey.set(key, c);
            }
        }
        const rows: any[] = [];
        for (const s of SYMBOL_OPTIONS) {
            for (const t of TF_OPTIONS) {
                const key = `${s.value}:${t.value}`;
                const c = byKey.get(key) || null;
                rows.push({
                    key,
                    symbol: s.value,
                    timeframe: t.value,
                    secondsToExpire: c?.secondsToExpire ?? null,
                    chosenOutcome: c?.chosenOutcome ?? null,
                    chosenPrice: c?.chosenPrice ?? null,
                    riskScore: c?.riskScore ?? null,
                    slug: c?.slug ?? null,
                    conditionId: c?.conditionId ?? null,
                });
            }
        }
        return rows;
    }, [candidates]);

    const fetchHistory = async () => {
        const res = await apiGet('history', `/group-arb/${strategy}/history`, { params: { refresh: true, intervalMs: 1000, maxEntries: 50, includeSkipped: showSkipped } });
        const h = Array.isArray(res.data?.history) ? res.data.history : [];
        setHistory(h.map((x: any) => ({ ...x, strategy })));
        setHistorySummary(res.data?.summary || null);
        setConfigEvents(Array.isArray(res.data?.configEvents) ? res.data.configEvents : []);
    };

    const fetchStoplossHistory = async () => {
        setStoplossLoading(true);
        try {
            const res = await apiGet('stoploss', `/group-arb/${strategy}/stoploss/history`, { params: { maxEntries: 200 } });
            const h = Array.isArray(res.data?.history) ? res.data.history : [];
            setStoplossHistory(h);
            setStoplossSummary(res.data?.summary || null);
        } finally {
            setStoplossLoading(false);
        }
    };

    const onOpenStoploss = async () => {
        setStoplossOpen(true);
        await fetchStoplossHistory().catch(() => {});
    };

    const onPersistConfig = async () => {
        setThresholdsSaving(true);
        try {
            const payload: any = {
                pollMs,
                expiresWithinSec,
                expiresWithinSecByTimeframe,
                minProb,
                amountUsd,
                splitBuyEnabled,
                splitBuyPct3m,
                splitBuyPct2m,
                splitBuyPct1m,
                splitBuyTrendEnabled,
                splitBuyTrendMinutes3m,
                splitBuyTrendMinutes2m,
                splitBuyTrendMinutes1m,
                symbols,
                timeframes,
                dojiGuardEnabled,
                riskSkipScore,
                riskAddOnBlockScore,
                stoplossEnabled,
                stoplossCut1DropCents,
                stoplossCut1SellPct,
                stoplossCut2DropCents,
                stoplossCut2SellPct,
                stoplossMinSecToExit,
                adaptiveDeltaEnabled,
                adaptiveDeltaBigMoveMultiplier,
                adaptiveDeltaRevertNoBuyCount,
            };
            if (strategy === 'cryptoall2') {
                payload.deltaSyncMode = deltaSyncMode;
                payload.adaptiveDeltaSync = adaptiveDeltaSync;
            }
            await apiPost('config', `/group-arb/${strategy}/config`, payload);
            message.success('Saved');
        } finally {
            setThresholdsSaving(false);
        }
    };

    const onStart = async () => {
        setStartLoading(true);
        try {
            const payload: any = {
                pollMs,
                expiresWithinSec,
                expiresWithinSecByTimeframe,
                minProb,
                amountUsd,
                splitBuyEnabled,
                splitBuyPct3m,
                splitBuyPct2m,
                splitBuyPct1m,
                splitBuyTrendEnabled,
                splitBuyTrendMinutes3m,
                splitBuyTrendMinutes2m,
                splitBuyTrendMinutes1m,
                symbols,
                timeframes,
                dojiGuardEnabled,
                riskSkipScore,
                riskAddOnBlockScore,
                stoplossEnabled,
                stoplossCut1DropCents,
                stoplossCut1SellPct,
                stoplossCut2DropCents,
                stoplossCut2SellPct,
                stoplossMinSecToExit,
                adaptiveDeltaEnabled,
                adaptiveDeltaBigMoveMultiplier,
                adaptiveDeltaRevertNoBuyCount,
            };
            if (strategy === 'cryptoall2') {
                payload.deltaSyncMode = deltaSyncMode;
                payload.adaptiveDeltaSync = adaptiveDeltaSync;
            }
            const res = await apiPost('auto_start', `/group-arb/${strategy}/auto/start`, payload);
            setStatus(res.data || null);
        } finally {
            setStartLoading(false);
        }
    };

    const onStop = async () => {
        setStopLoading(true);
        try {
            const res = await apiPost('auto_stop', `/group-arb/${strategy}/auto/stop`, {});
            setStatus(res.data || null);
        } finally {
            setStopLoading(false);
        }
    };

    const onQuickRefresh = async () => {
        setRefreshLoading(true);
        try {
            await Promise.allSettled([
                fetchStatus(),
                fetchCandidates(),
                fetchHistory(),
                fetchWatchdog(),
            ]);
        } finally {
            setRefreshLoading(false);
        }
    };

    const onSaveThresholds = async () => {
        setThresholdsSaving(true);
        try {
            await apiPost('thresholds_save', `/group-arb/${strategy}/delta-thresholds`, {
                btcMinDelta,
                ethMinDelta,
                solMinDelta,
                xrpMinDelta,
            });
            message.success('Saved');
        } finally {
            setThresholdsSaving(false);
        }
    };

    const fetchThresholds = async () => {
        setThresholdsLoading(true);
        try {
            const res = await apiGet('thresholds', `/group-arb/${strategy}/delta-thresholds`);
            const t = res.data?.thresholds || {};
            if (t.btcMinDelta != null) setBtcMinDelta(Number(t.btcMinDelta));
            if (t.ethMinDelta != null) setEthMinDelta(Number(t.ethMinDelta));
            if (t.solMinDelta != null) setSolMinDelta(Number(t.solMinDelta));
            if (t.xrpMinDelta != null) setXrpMinDelta(Number(t.xrpMinDelta));
        } finally {
            setThresholdsLoading(false);
        }
    };

    const deltaBoxEnabled = strategy === 'cryptoall2';
    const deltaBoxSymbolsKey = useMemo(() => (symbols || []).join(','), [symbols]);
    const fetchDeltaBox = async () => {
        if (!deltaBoxEnabled) return;
        setDeltaBoxLoading(true);
        try {
            const res = await apiGet('delta_box', '/group-arb/crypto/delta-box', {
                params: {
                    symbols: (symbols || []).join(','),
                    timeframes: '5m,15m',
                }
            });
            setDeltaBoxData(res.data || null);
        } finally {
            setDeltaBoxLoading(false);
        }
    };
    const computeDeltaBoxRecommended = useCallback((data: any) => {
        const rows = Array.isArray(data?.rows) ? data.rows : [];
        const findRow = (sym: string, tf: string) => rows.find((r: any) => String(r?.symbol || '').toUpperCase() === sym && String(r?.timeframe || '').toLowerCase() === tf);
        const takeAvg = (sym: string, tf: string, n: 10 | 20 | 50) => {
            const r = findRow(sym, tf);
            const k = n === 10 ? 'avg10' : n === 50 ? 'avg50' : 'avg20';
            const v = r?.a?.[k];
            return v != null && Number.isFinite(Number(v)) ? Number(v) : null;
        };
        const rec: any = {};
        for (const sym of ['BTC', 'ETH', 'SOL', 'XRP']) {
            const cfg = deltaBoxApplyBySymbol?.[sym] || { enabled: false, timeframe: '15m', n: 20, pct: 100 };
            if (!cfg.enabled) continue;
            const base = takeAvg(sym, cfg.timeframe, cfg.n);
            if (base == null) continue;
            const val = base * (Number(cfg.pct) / 100);
            if (!Number.isFinite(val)) continue;
            rec[sym] = val;
        }
        return rec as Record<string, number>;
    }, [deltaBoxApplyBySymbol]);
    const applyDeltaBoxToState = useCallback((data: any) => {
        const rec = computeDeltaBoxRecommended(data);
        if (rec.BTC != null) setBtcMinDelta(rec.BTC);
        if (rec.ETH != null) setEthMinDelta(rec.ETH);
        if (rec.SOL != null) setSolMinDelta(rec.SOL);
        if (rec.XRP != null) setXrpMinDelta(rec.XRP);
        return rec;
    }, [computeDeltaBoxRecommended]);
    const applyDeltaBoxAndSaveThresholds = useCallback(async () => {
        if (!deltaBoxEnabled) return;
        const data = deltaBoxData;
        const rec = applyDeltaBoxToState(data);
        if (!Object.keys(rec).length) return;
        const payload: any = {};
        if (rec.BTC != null) payload.btcMinDelta = rec.BTC;
        if (rec.ETH != null) payload.ethMinDelta = rec.ETH;
        if (rec.SOL != null) payload.solMinDelta = rec.SOL;
        if (rec.XRP != null) payload.xrpMinDelta = rec.XRP;
        await apiPost('thresholds_save', `/group-arb/${strategy}/delta-thresholds`, payload);
        message.success('Delta thresholds saved');
    }, [deltaBoxEnabled, deltaBoxData, applyDeltaBoxToState, apiPost, strategy]);
    useEffect(() => {
        if (!deltaBoxEnabled) return;
        if (!deltaBoxOpen) return;
        fetchDeltaBox().catch(() => {});
        const t = setInterval(() => fetchDeltaBox().catch(() => {}), 15_000);
        return () => { try { clearInterval(t); } catch {} };
    }, [deltaBoxEnabled, deltaBoxOpen, deltaBoxSymbolsKey]);
    useEffect(() => {
        if (!deltaBoxEnabled) return;
        if (!deltaBoxOpen) return;
        if (deltaBoxAutoConfirmEnabled !== true) return;
        if (!deltaBoxData) return;
        const now = Date.now();
        const minIntervalMs = Math.max(5, Math.floor(Number(deltaBoxAutoConfirmMinIntervalSec) || 60)) * 1000;
        if (deltaBoxLastAutoAtRef.current && now - deltaBoxLastAutoAtRef.current < minIntervalMs) return;
        const rec = computeDeltaBoxRecommended(deltaBoxData);
        if (!Object.keys(rec).length) return;
        const cur: any = { BTC: btcMinDelta, ETH: ethMinDelta, SOL: solMinDelta, XRP: xrpMinDelta };
        let should = false;
        for (const sym of Object.keys(rec)) {
            const next = Number(rec[sym]);
            const prev = Number(cur[sym]);
            const pct = prev > 0 ? (Math.abs(next - prev) / prev) * 100 : (next !== prev ? 100 : 0);
            if (pct >= Math.max(0, Number(deltaBoxAutoConfirmMinChangePct) || 0)) {
                should = true;
                break;
            }
        }
        if (!should) return;
        deltaBoxLastAutoAtRef.current = now;
        applyDeltaBoxAndSaveThresholds().catch(() => {});
    }, [deltaBoxEnabled, deltaBoxOpen, deltaBoxAutoConfirmEnabled, deltaBoxAutoConfirmMinIntervalSec, deltaBoxAutoConfirmMinChangePct, deltaBoxData, btcMinDelta, ethMinDelta, solMinDelta, xrpMinDelta, computeDeltaBoxRecommended, applyDeltaBoxAndSaveThresholds]);

    const onStartWatchdog = async () => {
        setWatchdogStartLoading(true);
        try {
            await apiPost('watchdog_start', '/group-arb/crypto15m/watchdog/start', { durationHours: 12, pollMs: 30000 });
            await fetchWatchdog();
        } finally {
            setWatchdogStartLoading(false);
        }
    };

    const onStopWatchdog = async () => {
        setWatchdogStopLoading(true);
        try {
            await apiPost('watchdog_stop', '/group-arb/crypto15m/watchdog/stop', { reason: 'manual_ui_stop', stopAuto: false });
            await fetchWatchdog();
        } finally {
            setWatchdogStopLoading(false);
        }
    };

    const onBid = async (row: any) => {
        const conditionId = String(row?.conditionId || '');
        if (!conditionId) return;
        const outcomeIndex = row?.chosenIndex != null ? Number(row.chosenIndex) : (row?.chosenOutcome === 'Down' ? 1 : 0);
        setBidLoadingId(conditionId);
        try {
            const payload: any = {
                conditionId,
                outcomeIndex,
                chosenTokenId: row?.chosenTokenId != null ? String(row.chosenTokenId) : undefined,
                amountUsd,
                minPrice: minProb,
                splitBuyEnabled,
                splitBuyPct3m,
                splitBuyPct2m,
                splitBuyPct1m,
                stoplossEnabled,
                stoplossCut1DropCents,
                stoplossCut1SellPct,
                stoplossCut2DropCents,
                stoplossCut2SellPct,
                stoplossMinSecToExit,
                adaptiveDeltaEnabled,
                adaptiveDeltaBigMoveMultiplier,
                adaptiveDeltaRevertNoBuyCount,
            };
            if (strategy === 'cryptoall2') {
                payload.timeframe = String(row?.timeframe || '15m').toLowerCase();
                payload.riskScore = row?.riskScore != null ? Number(row.riskScore) : undefined;
            }
            await apiPost('order', `/group-arb/${strategy}/order`, payload);
            message.success('Order placed');
            await fetchHistory().catch(() => {});
        } finally {
            setBidLoadingId(null);
        }
    };

    useEffect(() => {
        for (const c of abortersRef.current.values()) {
            try { c.abort(); } catch {}
        }
        abortersRef.current.clear();
        candidatesSigRef.current = '';
        setCandidates([]);
        setStatus(null);
        setWatchdog(null);
        setHistory([]);
        setConfigEvents([]);
        setHistorySummary(null);
        setStoplossHistory([]);
        setStoplossSummary(null);
        setReportText('');
        onQuickRefresh().catch(() => {});
        fetchThresholds().catch(() => {});
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            if (!autoRefresh) return;
            fetchStatus().catch(() => {});
            fetchCandidates().catch(() => {});
            fetchHistory().catch(() => {});
            fetchWatchdog().catch(() => {});
        }, Math.max(1500, Math.min(60_000, pollMs)));
        return () => {
            try { if (timerRef.current) clearInterval(timerRef.current); } catch {}
        };
    }, [apiPath, autoRefresh, pollMs, strategy]);

    const columns = useMemo(() => {
        return [
            { title: 'Symbol', dataIndex: 'symbol', key: 'symbol', width: 85, render: (v: any) => <Tag>{String(v || '-')}</Tag> },
            { title: 'TF', dataIndex: 'timeframe', key: 'timeframe', width: 70, render: (v: any) => <Tag>{String(v || '15m')}</Tag> },
            { title: 'Expire(s)', dataIndex: 'secondsToExpire', key: 'secondsToExpire', width: 95, render: (v: any) => <Tag color={Number(v) <= 60 ? 'red' : Number(v) <= 180 ? 'orange' : 'green'}>{Number(v) || 0}</Tag> },
            { title: 'Pick', dataIndex: 'chosenOutcome', key: 'chosenOutcome', width: 70, render: (v: any) => <Tag color={String(v) === 'Down' ? 'red' : 'green'}>{String(v || '-')}</Tag> },
            { title: 'Price', dataIndex: 'chosenPrice', key: 'chosenPrice', width: 85, render: (v: any) => <Tag>{v != null ? Number(v).toFixed(4) : '-'}</Tag> },
            { title: 'Δ', dataIndex: 'deltaAbs', key: 'deltaAbs', width: 85, render: (v: any) => <Tag>{v != null ? Number(v).toFixed(4) : '-'}</Tag> },
            { title: 'Risk', dataIndex: 'riskScore', key: 'riskScore', width: 85, render: (v: any) => <Tag color={Number(v) >= 70 ? 'red' : Number(v) >= 50 ? 'orange' : 'green'}>{v != null ? Number(v) : '-'}</Tag> },
            {
                title: 'Actions',
                key: 'actions',
                width: 140,
                render: (_: any, row: any) => (
                    <Space>
                        <Button size="small" loading={bidLoadingId === String(row?.conditionId || '')} onClick={() => onBid(row)}>Bid</Button>
                        <Tooltip title={String(row?.conditionId || '')}><Tag>ID</Tag></Tooltip>
                    </Space>
                )
            }
        ];
    }, [bidLoadingId, amountUsd, minProb, expiresWithinSec, stoplossEnabled, stoplossCut1DropCents, stoplossCut1SellPct, stoplossCut2DropCents, stoplossCut2SellPct, stoplossMinSecToExit, splitBuyEnabled, splitBuyPct3m, splitBuyPct2m, splitBuyPct1m, adaptiveDeltaEnabled, adaptiveDeltaBigMoveMultiplier, adaptiveDeltaRevertNoBuyCount]);

    return (
        <div style={{ padding: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
                <Card bodyStyle={{ background: '#111', color: '#fff' }}>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start">
                        <div>
                            <Title level={3} style={{ color: '#fff', marginTop: 0 }}>{title}</Title>
                            <div style={{ opacity: 0.8 }}>{autoSummary}</div>
                            <div style={{ marginTop: 8 }}>
                                <Space wrap>
                                    <Tag color={status?.enabled === true ? 'green' : 'red'}>Auto: {status?.enabled === true ? 'ON' : 'OFF'}</Tag>
                                    {typeof status?.hasValidKey === 'boolean' ? <Tag color={status?.hasValidKey ? 'green' : 'red'}>Key: {status?.hasValidKey ? 'OK' : 'MISSING'}</Tag> : null}
                                    {status?.trading ? (
                                        <>
                                            <Tag color={status.trading.initialized === true ? 'green' : 'orange'}>Trading: {status.trading.initialized === true ? 'OK' : 'INIT'}</Tag>
                                            <Tag color={status.trading.hasCredentials === true ? 'green' : 'red'}>Creds: {status.trading.hasCredentials === true ? 'OK' : 'MISSING'}</Tag>
                                            {status.trading.lastInitError ? <Tag color="red">{String(status.trading.lastInitError).slice(0, 80)}</Tag> : null}
                                        </>
                                    ) : null}
                                    <Tag color={watchdog?.running === true ? 'green' : 'default'}>Watchdog: {watchdog?.running === true ? 'ON' : 'OFF'}</Tag>
                                    {status?.lastError ? <Tag color="red">{String(status.lastError).slice(0, 80)}</Tag> : null}
                                    {status?.lastScanAt ? <Tag>LastScan: {String(status.lastScanAt || '-')}</Tag> : null}
                                    {historySummary?.count != null ? <Tag color="blue">History: {Number(historySummary.count || 0)}</Tag> : null}
                                    {status?.adaptiveDelta ? ['BTC', 'ETH', 'SOL', 'XRP'].map((sym) => {
                                        const s = (status?.adaptiveDelta || {})[sym] || null;
                                        if (!s) return null;
                                        const base = s.baseMinDelta != null ? Number(s.baseMinDelta) : null;
                                        const ov = s.overrideMinDelta != null ? Number(s.overrideMinDelta) : null;
                                        if (base == null) return null;
                                        return <Tag key={`ad-${sym}`} color={ov != null ? 'gold' : 'default'}>{sym} Δ {ov != null ? `${base}→${ov}` : String(base)}</Tag>;
                                    }) : null}
                                </Space>
                            </div>
                        </div>
                        <Space>
                            <Button icon={<ReloadOutlined />} onClick={onQuickRefresh} loading={refreshLoading}>Refresh</Button>
                            {deltaBoxEnabled ? <Button onClick={() => { setDeltaBoxOpen(true); fetchDeltaBox().catch(() => {}); }}>Delta Box</Button> : null}
                            <Button onClick={onPersistConfig} loading={thresholdsSaving}>Save</Button>
                            <Button type="primary" onClick={onStart} loading={startLoading} disabled={status?.enabled === true}>Start</Button>
                            <Button danger onClick={onStop} loading={stopLoading} disabled={status?.enabled !== true}>Stop</Button>
                        </Space>
                    </Space>
                </Card>

                <Card title="Settings">
                    <Space wrap>
                        <Tooltip title="Poll interval (ms)">
                            <InputNumber min={500} step={100} value={pollMs} onChange={(v) => setPollMs(Math.max(500, Math.floor(Number(v) || 4000)))} />
                        </Tooltip>
                        <Tooltip title="Min probability">
                            <InputNumber
                                min={0.001}
                                max={0.999}
                                step={0.001}
                                precision={3}
                                value={minProb}
                                onChange={(v) => {
                                    const n = Number(v);
                                    if (!Number.isFinite(n)) return;
                                    setMinProb(Math.max(0.001, Math.min(0.999, Math.round(n * 1000) / 1000)));
                                }}
                            />
                        </Tooltip>
                        <Tooltip title="Seconds to expiry (<=)">
                            <InputNumber
                                min={10}
                                max={9999}
                                step={1}
                                value={expiresWithinSec}
                                onChange={(v) => {
                                    const n = Math.max(10, Math.floor(Number(v) || 180));
                                    setExpiresWithinSec(n);
                                    setExpiresWithinSecByTimeframe((prev) => {
                                        const next = { ...(prev || {}) };
                                        for (const tf of (timeframes || [])) next[String(tf)] = n;
                                        return next;
                                    });
                                }}
                            />
                        </Tooltip>
                        <Tooltip title="Amount USD per entry">
                            <InputNumber min={1} max={5000} step={1} value={amountUsd} onChange={(v) => setAmountUsd(Math.max(1, Number(v) || 1))} />
                        </Tooltip>
                        <Tooltip title="Symbols">
                            <Select mode="multiple" style={{ minWidth: 240 }} value={symbols} options={SYMBOL_OPTIONS} onChange={(v) => setSymbols(Array.isArray(v) ? v : [])} />
                        </Tooltip>
                        <Tooltip title="Timeframes">
                            <Select
                                mode="multiple"
                                style={{ minWidth: 220 }}
                                value={timeframes}
                                options={timeframeOptions}
                                onChange={(v) => {
                                    const raw = Array.isArray(v) ? v.map((x) => String(x || '').toLowerCase()).filter(Boolean) : [];
                                    if (strategy === 'cryptoall2') {
                                        const next = raw.filter((t) => t === '5m' || t === '15m');
                                        setTimeframes(next.length ? next : ['15m']);
                                    } else {
                                        setTimeframes(['15m']);
                                    }
                                }}
                            />
                        </Tooltip>
                        <Tooltip title="Show skipped history entries">
                            <Checkbox checked={showSkipped} onChange={(e) => setShowSkipped(e.target.checked)}>Show skipped</Checkbox>
                        </Tooltip>
                        <Tooltip title="Auto refresh UI">
                            <Checkbox checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)}>Auto refresh</Checkbox>
                        </Tooltip>
                    </Space>
                    <div style={{ marginTop: 12 }}>
                        <Space wrap>
                            {(timeframes || []).map((tf) => (
                                <Tooltip key={`exp-${tf}`} title={`Seconds to expiry (<=) for ${tf}`}>
                                    <Space size={6}>
                                        <Tag>{String(tf)}</Tag>
                                        <InputNumber
                                            min={10}
                                            max={9999}
                                            step={1}
                                            value={expiresWithinSecByTimeframe?.[String(tf)] ?? expiresWithinSec}
                                            onChange={(v) => {
                                                const n = Math.max(10, Math.floor(Number(v) || 180));
                                                setExpiresWithinSecByTimeframe((prev) => ({ ...(prev || {}), [String(tf)]: n }));
                                            }}
                                        />
                                    </Space>
                                </Tooltip>
                            ))}
                        </Space>
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <Space wrap>
                            <Checkbox checked={dojiGuardEnabled} onChange={(e) => setDojiGuardEnabled(e.target.checked)}>DojiGuard</Checkbox>
                            <Tooltip title="Skip if riskScore >= this">
                                <InputNumber min={0} max={100} step={1} value={riskSkipScore} onChange={(v) => setRiskSkipScore(Math.max(0, Math.min(100, Math.floor(Number(v) || 70))))} />
                            </Tooltip>
                            <Tooltip title="Block split-buy add-on if riskScore >= this">
                                <InputNumber min={0} max={100} step={1} value={riskAddOnBlockScore} onChange={(v) => setRiskAddOnBlockScore(Math.max(0, Math.min(100, Math.floor(Number(v) || 50))))} />
                            </Tooltip>
                            {strategy === 'cryptoall2' ? (
                                <Tooltip title="Delta base source">
                                    <Select
                                        style={{ width: 180 }}
                                        value={deltaSyncMode}
                                        options={[
                                            { label: 'Use ALL2 base', value: 'cryptoall2_base' },
                                            { label: 'Use 15m base', value: 'crypto15m_base' },
                                            { label: 'Use MAX(base)', value: 'max' },
                                        ]}
                                        onChange={(v) => setDeltaSyncMode(String(v) === 'crypto15m_base' ? 'crypto15m_base' : String(v) === 'max' ? 'max' : 'cryptoall2_base')}
                                    />
                                </Tooltip>
                            ) : null}
                            {strategy === 'cryptoall2' ? (
                                <Checkbox checked={adaptiveDeltaSync} onChange={(e) => setAdaptiveDeltaSync(e.target.checked)}>Sync adaptiveΔ</Checkbox>
                            ) : null}
                            <Checkbox checked={splitBuyEnabled} onChange={(e) => setSplitBuyEnabled(e.target.checked)}>Split Buy</Checkbox>
                            <InputNumber min={0} max={1000} step={1} value={splitBuyPct3m} onChange={(v) => setSplitBuyPct3m(Math.max(0, Math.min(1000, Math.floor(Number(v) || 0))))} />
                            <InputNumber min={0} max={1000} step={1} value={splitBuyPct2m} onChange={(v) => setSplitBuyPct2m(Math.max(0, Math.min(1000, Math.floor(Number(v) || 0))))} />
                            <InputNumber min={0} max={1000} step={1} value={splitBuyPct1m} onChange={(v) => setSplitBuyPct1m(Math.max(0, Math.min(1000, Math.floor(Number(v) || 0))))} />
                            <Checkbox checked={splitBuyTrendEnabled} onChange={(e) => setSplitBuyTrendEnabled(e.target.checked)}>Trend gate</Checkbox>
                            <InputNumber min={1} max={10} step={1} value={splitBuyTrendMinutes3m} onChange={(v) => setSplitBuyTrendMinutes3m(Math.max(1, Math.min(10, Math.floor(Number(v) || 3))))} />
                            <InputNumber min={1} max={10} step={1} value={splitBuyTrendMinutes2m} onChange={(v) => setSplitBuyTrendMinutes2m(Math.max(1, Math.min(10, Math.floor(Number(v) || 2))))} />
                            <InputNumber min={1} max={10} step={1} value={splitBuyTrendMinutes1m} onChange={(v) => setSplitBuyTrendMinutes1m(Math.max(1, Math.min(10, Math.floor(Number(v) || 1))))} />
                        </Space>
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <Space wrap>
                            <Checkbox checked={stoplossEnabled} onChange={(e) => setStoplossEnabled(e.target.checked)}>CutLoss</Checkbox>
                            <InputNumber min={0} max={50} step={1} value={stoplossCut1DropCents} onChange={(v) => setStoplossCut1DropCents(Math.max(0, Math.min(50, Math.floor(Number(v) || 0))))} />
                            <InputNumber min={0} max={100} step={1} value={stoplossCut1SellPct} onChange={(v) => setStoplossCut1SellPct(Math.max(0, Math.min(100, Math.floor(Number(v) || 0))))} />
                            <InputNumber min={0} max={50} step={1} value={stoplossCut2DropCents} onChange={(v) => setStoplossCut2DropCents(Math.max(0, Math.min(50, Math.floor(Number(v) || 0))))} />
                            <InputNumber min={0} max={100} step={1} value={stoplossCut2SellPct} onChange={(v) => setStoplossCut2SellPct(Math.max(0, Math.min(100, Math.floor(Number(v) || 0))))} />
                            <InputNumber min={0} max={600} step={1} value={stoplossMinSecToExit} onChange={(v) => setStoplossMinSecToExit(Math.max(0, Math.min(600, Math.floor(Number(v) || 0))))} />
                            <Checkbox checked={adaptiveDeltaEnabled} onChange={(e) => setAdaptiveDeltaEnabled(e.target.checked)}>Adaptive Δ</Checkbox>
                            <InputNumber min={1} max={10} step={0.1} value={adaptiveDeltaBigMoveMultiplier} onChange={(v) => setAdaptiveDeltaBigMoveMultiplier(Math.max(1, Math.min(10, Number(v) || 2)))} />
                            <InputNumber min={1} max={50} step={1} value={adaptiveDeltaRevertNoBuyCount} onChange={(v) => setAdaptiveDeltaRevertNoBuyCount(Math.max(1, Math.min(50, Math.floor(Number(v) || 4))))} />
                        </Space>
                    </div>
                </Card>

                <Card title="Delta Thresholds">
                    <Space wrap>
                        <Tag>BTC</Tag>
                        <InputNumber min={0} step={1} value={btcMinDelta} onChange={(v) => setBtcMinDelta(Number(v) || 0)} />
                        <Tag>ETH</Tag>
                        <InputNumber min={0} step={0.1} value={ethMinDelta} onChange={(v) => setEthMinDelta(Number(v) || 0)} />
                        <Tag>SOL</Tag>
                        <InputNumber min={0} step={0.01} value={solMinDelta} onChange={(v) => setSolMinDelta(Number(v) || 0)} />
                        <Tag>XRP</Tag>
                        <InputNumber min={0} step={0.0001} value={xrpMinDelta} onChange={(v) => setXrpMinDelta(Number(v) || 0)} />
                        <Button onClick={onSaveThresholds} loading={thresholdsSaving}>Save thresholds</Button>
                    </Space>
                </Card>

                <Card title="Candidates" extra={<Space><Button onClick={() => setMatrixOpen(true)}>Matrix</Button><Button onClick={onOpenStoploss}>Stoploss</Button></Space>}>
                    <Table
                        rowKey={(r: any) => String(r?.conditionId || '') + ':' + String(r?.chosenTokenId || '')}
                        size="small"
                        columns={columns as any}
                        dataSource={candidates}
                        pagination={{ pageSize: 20 }}
                        virtual
                        scroll={{ y: 420 }}
                    />
                </Card>

                <Card title="History" extra={<Space><Button onClick={onOpenReport}>Report</Button><Button onClick={onStartWatchdog} loading={watchdogStartLoading} disabled={watchdog?.running === true}>{watchdog?.running ? 'Watchdog: ON' : 'Start Watchdog (12h)'}</Button><Button danger onClick={onStopWatchdog} loading={watchdogStopLoading} disabled={watchdog?.running !== true}>Stop Watchdog</Button></Space>}>
                    {configEvents.length ? (
                        <div style={{ marginBottom: 12 }}>
                            <Table
                                rowKey={(r: any) => String(r?.id || '')}
                                size="small"
                                dataSource={configEvents.slice(0, 20)}
                                pagination={false}
                                columns={[
                                    { title: 'At', dataIndex: 'timestamp', key: 'timestamp', width: 180, render: (v: any) => <Tag>{String(v || '-')}</Tag> },
                                    { title: 'Event', dataIndex: 'type', key: 'type', width: 180, render: (v: any) => <Tag>{String(v || '-')}</Tag> },
                                    { title: 'Reason', dataIndex: 'reason', key: 'reason', render: (v: any) => String(v || '-') },
                                ]}
                            />
                        </div>
                    ) : null}
                    <Space wrap style={{ marginBottom: 8 }}>
                        {historySummary ? <Tag>Total: {Number(historySummary.count || 0)}</Tag> : null}
                        {historySummary ? <Tag>Stake: {Number(historySummary.totalStakeUsd || 0).toFixed(2)}</Tag> : null}
                        {historySummary ? <Tag>PnL: {Number(historySummary.pnlTotalUsdc || 0).toFixed(4)}</Tag> : null}
                        {historySummary ? <Tag>W: {Number(historySummary.winCount || 0)}</Tag> : null}
                        {historySummary ? <Tag>L: {Number(historySummary.lossCount || 0)}</Tag> : null}
                        {historySummary ? <Tag>O: {Number(historySummary.openCount || 0)}</Tag> : null}
                    </Space>
                    <Table
                        rowKey={(r: any) => String(r?.id || '')}
                        size="small"
                        dataSource={history}
                        pagination={{ pageSize: 20 }}
                        virtual
                        scroll={{ y: 520 }}
                        columns={[
                            { title: 'At', dataIndex: 'timestamp', key: 'timestamp', width: 180, render: (v: any) => <Tag>{String(v || '-')}</Tag> },
                            { title: 'Action', dataIndex: 'action', key: 'action', width: 140, render: (v: any) => <Tag>{String(v || '-')}</Tag> },
                            { title: 'Symbol', dataIndex: 'symbol', key: 'symbol', width: 80, render: (v: any) => <Tag>{String(v || '-')}</Tag> },
                            { title: 'TF', dataIndex: 'timeframe', key: 'timeframe', width: 70, render: (v: any) => <Tag>{String(v || '15m')}</Tag> },
                            { title: 'Result', dataIndex: 'result', key: 'result', width: 80, render: (v: any) => <Tag color={String(v) === 'WIN' ? 'green' : String(v) === 'LOSS' ? 'red' : 'blue'}>{String(v || '-')}</Tag> },
                            { title: 'Stake', dataIndex: 'amountUsd', key: 'amountUsd', width: 90, render: (v: any) => <Tag>{Number(v || 0).toFixed(2)}</Tag> },
                            { title: 'PnL', dataIndex: 'realizedPnlUsdc', key: 'realizedPnlUsdc', width: 90, render: (v: any) => <Tag>{Number(v || 0).toFixed(4)}</Tag> },
                            { title: 'Cond', dataIndex: 'marketId', key: 'marketId', width: 180, render: (v: any) => <Tooltip title={String(v || '')}><Tag>id</Tag></Tooltip> },
                        ]}
                    />
                </Card>

                <Modal
                    title="Stoploss History"
                    open={stoplossOpen}
                    onCancel={() => setStoplossOpen(false)}
                    footer={<Space><Button onClick={() => fetchStoplossHistory()} loading={stoplossLoading}>Refresh</Button><Button onClick={() => setStoplossOpen(false)}>Close</Button></Space>}
                    width={1100}
                >
                    <Space wrap style={{ marginBottom: 10 }}>
                        {stoplossSummary ? <Tag>OK: {Number(stoplossSummary.successCount || 0)}</Tag> : null}
                        {stoplossSummary ? <Tag>Skip: {Number(stoplossSummary.skippedCount || 0)}</Tag> : null}
                        {stoplossSummary ? <Tag>Fail: {Number(stoplossSummary.failedCount || 0)}</Tag> : null}
                    </Space>
                    <Table
                        rowKey={(r: any) => String(r?.id || '')}
                        size="small"
                        loading={stoplossLoading}
                        dataSource={stoplossHistory}
                        pagination={{ pageSize: 20 }}
                        virtual
                        scroll={{ y: 520 }}
                        columns={[
                            { title: 'At', dataIndex: 'timestamp', key: 'timestamp', width: 180, render: (v: any) => <Tag>{String(v || '-')}</Tag> },
                            { title: 'Symbol', dataIndex: 'symbol', key: 'symbol', width: 80, render: (v: any) => <Tag>{String(v || '-')}</Tag> },
                            { title: 'TF', dataIndex: 'timeframe', key: 'timeframe', width: 70, render: (v: any) => <Tag>{String(v || '15m')}</Tag> },
                            { title: 'Reason', dataIndex: 'reason', key: 'reason', width: 140, render: (v: any) => <Tag>{String(v || '-')}</Tag> },
                            { title: 'Sell', dataIndex: 'sellAmount', key: 'sellAmount', width: 120, render: (v: any) => <Tag>{v != null ? Number(v) : '-'}</Tag> },
                            { title: 'Sec', dataIndex: 'secondsToExpire', key: 'secondsToExpire', width: 90, render: (v: any) => <Tag>{v != null ? Number(v) : '-'}</Tag> },
                            { title: 'Entry', dataIndex: 'entryPrice', key: 'entryPrice', width: 90, render: (v: any) => <Tag>{v != null ? Number(v).toFixed(4) : '-'}</Tag> },
                            { title: 'Bid', dataIndex: 'currentBid', key: 'currentBid', width: 90, render: (v: any) => <Tag>{v != null ? Number(v).toFixed(4) : '-'}</Tag> },
                            { title: 'Ask', dataIndex: 'currentAsk', key: 'currentAsk', width: 90, render: (v: any) => <Tag>{v != null ? Number(v).toFixed(4) : '-'}</Tag> },
                            { title: 'OK', dataIndex: 'success', key: 'success', width: 60, render: (v: any) => <Tag color={v === true ? 'green' : 'red'}>{v === true ? 'Y' : 'N'}</Tag> },
                            { title: 'Skip', dataIndex: 'skipped', key: 'skipped', width: 60, render: (v: any) => <Tag color={v === true ? 'orange' : 'default'}>{v === true ? 'Y' : 'N'}</Tag> },
                            { title: 'Err', dataIndex: 'error', key: 'error', render: (v: any) => <span style={{ color: '#b00' }}>{String(v || '')}</span> },
                        ]}
                    />
                </Modal>

                <Modal title="Watchdog Report" open={reportOpen} onCancel={() => setReportOpen(false)} footer={<Button onClick={() => setReportOpen(false)}>Close</Button>} width={1000}>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>{reportLoading ? 'Loading...' : reportText}</pre>
                </Modal>

                <Modal
                    title="Delta Box"
                    open={deltaBoxOpen}
                    onCancel={() => setDeltaBoxOpen(false)}
                    footer={
                        <Space>
                            <Button onClick={() => fetchDeltaBox()} loading={deltaBoxLoading} disabled={!deltaBoxEnabled}>Refresh</Button>
                            <Button onClick={() => applyDeltaBoxToState(deltaBoxData)} disabled={!deltaBoxEnabled || !deltaBoxData}>Apply</Button>
                            <Button type="primary" onClick={() => applyDeltaBoxAndSaveThresholds()} disabled={!deltaBoxEnabled || !deltaBoxData}>Apply + Save</Button>
                            <Button onClick={() => setDeltaBoxOpen(false)}>Close</Button>
                        </Space>
                    }
                    width={1050}
                >
                    {!deltaBoxEnabled ? <Tag color="red">Only available on CryptoAll2</Tag> : null}
                    <Space direction="vertical" style={{ width: '100%' }} size={12}>
                        <Card size="small" title="Auto Confirm">
                            <Space wrap>
                                <Checkbox checked={deltaBoxAutoConfirmEnabled} onChange={(e) => setDeltaBoxAutoConfirmEnabled(e.target.checked)}>Enabled</Checkbox>
                                <Tag>Min interval(s)</Tag>
                                <InputNumber min={5} max={3600} step={5} value={deltaBoxAutoConfirmMinIntervalSec} onChange={(v) => setDeltaBoxAutoConfirmMinIntervalSec(Math.max(5, Math.min(3600, Math.floor(Number(v) || 60))))} />
                                <Tag>Min change(%)</Tag>
                                <InputNumber min={0} max={100} step={1} value={deltaBoxAutoConfirmMinChangePct} onChange={(v) => setDeltaBoxAutoConfirmMinChangePct(Math.max(0, Math.min(100, Math.floor(Number(v) || 0))))} />
                            </Space>
                        </Card>
                        <Card size="small" title="Apply Rules">
                            <Table
                                rowKey={(r: any) => String(r?.symbol || '')}
                                size="small"
                                pagination={false}
                                dataSource={['BTC', 'ETH', 'SOL', 'XRP'].map((sym) => ({ symbol: sym }))}
                                columns={[
                                    { title: 'Symbol', dataIndex: 'symbol', key: 'symbol', width: 90, render: (v: any) => <Tag>{String(v)}</Tag> },
                                    {
                                        title: 'On',
                                        key: 'enabled',
                                        width: 70,
                                        render: (_: any, r: any) => {
                                            const sym = String(r?.symbol || '');
                                            const cfg = deltaBoxApplyBySymbol?.[sym] || { enabled: false, timeframe: '15m', n: 20, pct: 100 };
                                            return <Checkbox checked={cfg.enabled === true} onChange={(e) => setDeltaBoxApplyBySymbol((prev) => ({ ...(prev || {}), [sym]: { ...cfg, enabled: e.target.checked } }))} />;
                                        }
                                    },
                                    {
                                        title: 'TF',
                                        key: 'tf',
                                        width: 90,
                                        render: (_: any, r: any) => {
                                            const sym = String(r?.symbol || '');
                                            const cfg = deltaBoxApplyBySymbol?.[sym] || { enabled: false, timeframe: '15m', n: 20, pct: 100 };
                                            return (
                                                <Select
                                                    style={{ width: 80 }}
                                                    value={cfg.timeframe}
                                                    options={[{ label: '5m', value: '5m' }, { label: '15m', value: '15m' }]}
                                                    onChange={(v) => setDeltaBoxApplyBySymbol((prev) => ({ ...(prev || {}), [sym]: { ...cfg, timeframe: (String(v) === '5m' ? '5m' : '15m') as any } }))}
                                                />
                                            );
                                        }
                                    },
                                    {
                                        title: 'N',
                                        key: 'n',
                                        width: 80,
                                        render: (_: any, r: any) => {
                                            const sym = String(r?.symbol || '');
                                            const cfg = deltaBoxApplyBySymbol?.[sym] || { enabled: false, timeframe: '15m', n: 20, pct: 100 };
                                            return (
                                                <Select
                                                    style={{ width: 70 }}
                                                    value={cfg.n}
                                                    options={[{ label: '10', value: 10 }, { label: '20', value: 20 }, { label: '50', value: 50 }]}
                                                    onChange={(v) => setDeltaBoxApplyBySymbol((prev) => ({ ...(prev || {}), [sym]: { ...cfg, n: (Number(v) === 10 ? 10 : Number(v) === 50 ? 50 : 20) as any } }))}
                                                />
                                            );
                                        }
                                    },
                                    {
                                        title: 'Pct',
                                        key: 'pct',
                                        width: 100,
                                        render: (_: any, r: any) => {
                                            const sym = String(r?.symbol || '');
                                            const cfg = deltaBoxApplyBySymbol?.[sym] || { enabled: false, timeframe: '15m', n: 20, pct: 100 };
                                            return (
                                                <InputNumber
                                                    min={0}
                                                    max={500}
                                                    step={1}
                                                    value={cfg.pct}
                                                    onChange={(v) => setDeltaBoxApplyBySymbol((prev) => ({ ...(prev || {}), [sym]: { ...cfg, pct: Math.max(0, Math.min(500, Math.floor(Number(v) || 100))) } }))}
                                                />
                                            );
                                        }
                                    },
                                    {
                                        title: 'A(10/20/50)',
                                        key: 'a',
                                        render: (_: any, r: any) => {
                                            const sym = String(r?.symbol || '');
                                            const cfg = deltaBoxApplyBySymbol?.[sym] || { enabled: false, timeframe: '15m', n: 20, pct: 100 };
                                            const rows = Array.isArray(deltaBoxData?.rows) ? deltaBoxData.rows : [];
                                            const row = rows.find((x: any) => String(x?.symbol || '').toUpperCase() === sym && String(x?.timeframe || '').toLowerCase() === String(cfg.timeframe));
                                            const a10 = row?.a?.avg10;
                                            const a20 = row?.a?.avg20;
                                            const a50 = row?.a?.avg50;
                                            const fmt = (v: any) => (v != null && Number.isFinite(Number(v))) ? Number(v).toFixed(6) : '-';
                                            return <span>{fmt(a10)} / {fmt(a20)} / {fmt(a50)}</span>;
                                        }
                                    }
                                ]}
                            />
                        </Card>
                    </Space>
                </Modal>

                <Modal title="Matrix" open={matrixOpen} onCancel={() => setMatrixOpen(false)} footer={<Button onClick={() => setMatrixOpen(false)}>Close</Button>} width={1000}>
                    <Space wrap style={{ marginBottom: 12 }}>
                        {SYMBOL_OPTIONS.map((s) => <Tag key={s.value}>{s.value}</Tag>)}
                        {timeframeOptions.map((t) => <Tag key={t.value}>{t.value}</Tag>)}
                    </Space>
                    <Table
                        rowKey={(r: any) => String(r?.key || '')}
                        size="small"
                        dataSource={matrixRows}
                        pagination={false}
                        tableLayout="fixed"
                        scroll={{ x: 900 }}
                        columns={[
                            { title: 'Symbol', dataIndex: 'symbol', key: 'symbol', width: 90, render: (v: any) => <Tag>{String(v || '-')}</Tag> },
                            { title: 'TF', dataIndex: 'timeframe', key: 'timeframe', width: 70, render: (v: any) => <Tag>{String(v || '15m')}</Tag> },
                            { title: 'Expire(s)', dataIndex: 'secondsToExpire', key: 'secondsToExpire', width: 95, render: (v: any) => v != null ? <Tag color={Number(v) <= 60 ? 'red' : Number(v) <= 180 ? 'orange' : 'green'}>{Number(v) || 0}</Tag> : <Tag>-</Tag> },
                            { title: 'Pick', dataIndex: 'chosenOutcome', key: 'chosenOutcome', width: 80, render: (v: any) => v ? <Tag color={String(v) === 'Down' ? 'red' : 'green'}>{String(v)}</Tag> : <Tag>-</Tag> },
                            { title: 'Price', dataIndex: 'chosenPrice', key: 'chosenPrice', width: 90, render: (v: any) => v != null ? <Tag>{Number(v).toFixed(4)}</Tag> : <Tag>-</Tag> },
                            { title: 'Risk', dataIndex: 'riskScore', key: 'riskScore', width: 85, render: (v: any) => v != null ? <Tag color={Number(v) >= 70 ? 'red' : Number(v) >= 50 ? 'orange' : 'green'}>{Number(v)}</Tag> : <Tag>-</Tag> },
                            {
                                title: 'Market',
                                key: 'market',
                                render: (_: any, r: any) => {
                                    const slug = String(r?.slug || '').trim();
                                    const cid = String(r?.conditionId || '').trim();
                                    if (slug) return <a href={`https://polymarket.com/event/${encodeURIComponent(slug)}`} target="_blank" rel="noreferrer">{slug}</a>;
                                    return cid ? <Tooltip title={cid}><Tag>ID</Tag></Tooltip> : '-';
                                }
                            }
                        ]}
                    />
                </Modal>
            </Space>
        </div>
    );
}
