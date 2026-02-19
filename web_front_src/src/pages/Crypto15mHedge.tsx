import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, Checkbox, InputNumber, Select, Space, Table, Tag, Typography, message } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useAccountApiPath } from '../api/apiPath';

const { Title } = Typography;
type Range = '1D' | '1W' | '1M' | 'ALL';

const api = axios.create({
    baseURL: '/api',
    timeout: 120000,
});

function Crypto15mHedge() {
    const apiPath = useAccountApiPath();
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
    const [status, setStatus] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [entrySignals, setEntrySignals] = useState<any[]>([]);
    const [hedgeSignals, setHedgeSignals] = useState<any[]>([]);
    const [opportunities, setOpportunities] = useState<any[]>([]);
    const [showAllPeriods, setShowAllPeriods] = useState<boolean>(false);
    const [historyFilter, setHistoryFilter] = useState<'all' | 'attempts' | 'orders'>('all');
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshLoading, setRefreshLoading] = useState(false);
    const [startLoading, setStartLoading] = useState(false);
    const [stopLoading, setStopLoading] = useState(false);
    const [range, setRange] = useState<Range>('1D');
    const [pnl, setPnl] = useState<any>(null);
    const [simPnl, setSimPnl] = useState<any>(null);
    const [pnlLoading, setPnlLoading] = useState(false);
    const [editing, setEditing] = useState(false);
    const editingRef = useRef(false);
    const editingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const beginEditing = useCallback(() => {
        if (editingTimerRef.current) clearTimeout(editingTimerRef.current);
        editingTimerRef.current = null;
        setEditing(true);
    }, []);
    const bumpEditing = useCallback(() => {
        if (editingTimerRef.current) clearTimeout(editingTimerRef.current);
        setEditing(true);
        editingTimerRef.current = setTimeout(() => setEditing(false), 1200);
    }, []);
    const endEditingSoon = useCallback(() => {
        if (editingTimerRef.current) clearTimeout(editingTimerRef.current);
        editingTimerRef.current = setTimeout(() => setEditing(false), 250);
    }, []);
    useEffect(() => { editingRef.current = editing; }, [editing]);
    useEffect(() => {
        return () => {
            if (editingTimerRef.current) clearTimeout(editingTimerRef.current);
        };
    }, []);

    const [pollMs, setPollMs] = useState<number>(2000);
    const [minProb, setMinProb] = useState<number>(0);
    const [amountUsd, setAmountUsd] = useState<number>(200);
    const [simEnabled, setSimEnabled] = useState<boolean>(false);
    const [simInitialUsdc, setSimInitialUsdc] = useState<number>(1000);
    const [entryStartSec, setEntryStartSec] = useState<number>(900);
    const [entryEndSec, setEntryEndSec] = useState<number>(480);
    const [cheapMinCents, setCheapMinCents] = useState<number>(8);
    const [cheapMaxCents, setCheapMaxCents] = useState<number>(15);
    const [targetProfitCents, setTargetProfitCents] = useState<number>(10);
    const [profitDecayEnabled, setProfitDecayEnabled] = useState<boolean>(false);
    const [profitDecayMode, setProfitDecayMode] = useState<'linear' | 'per_minute'>('linear');
    const [profitDecayPerMinCents, setProfitDecayPerMinCents] = useState<number>(1);
    const [profitStartCents, setProfitStartCents] = useState<number>(10);
    const [profitEndCents, setProfitEndCents] = useState<number>(9);
    const [profitDecayStartSec, setProfitDecayStartSec] = useState<number>(300);
    const [profitDecayEndSec, setProfitDecayEndSec] = useState<number>(60);
    const [profitStepCents, setProfitStepCents] = useState<number>(0.1);
    const [mode, setMode] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
    const [bufferCents, setBufferCents] = useState<number | null>(null);
    const [maxSpreadCents, setMaxSpreadCents] = useState<number | null>(null);
    const [minDepthPct, setMinDepthPct] = useState<number | null>(null);
    const [minSecToHedge, setMinSecToHedge] = useState<number>(90);
    const [hedgeIgnoreSpread, setHedgeIgnoreSpread] = useState<boolean>(false);
    const [panicHedgeEnabled, setPanicHedgeEnabled] = useState<boolean>(false);
    const [panicHedgeStartSec, setPanicHedgeStartSec] = useState<number>(120);
    const [panicMaxLossCents, setPanicMaxLossCents] = useState<number>(20);

    const timerRef = useRef<any>(null);

    const enabled = !!status?.enabled;

    const configBody = useMemo(() => {
        const entryRemainingMinSec = Math.max(0, Math.min(900, Math.floor(Number(entryEndSec))));
        const entryRemainingMaxSec = Math.max(entryRemainingMinSec, Math.min(900, Math.floor(Number(entryStartSec))));
        return {
            pollMs,
            minProb,
            amountUsd,
            simEnabled,
            simInitialUsdc,
            entryRemainingMinSec,
            entryRemainingMaxSec,
            entryCheapMinCents: cheapMinCents,
            entryCheapMaxCents: cheapMaxCents,
            targetProfitCents,
            profitDecayEnabled,
            profitDecayMode,
            profitDecayPerMinCents,
            profitStartCents,
            profitEndCents,
            profitDecayStartSec,
            profitDecayEndSec,
            profitStepCents,
            mode,
            bufferCents: bufferCents != null ? bufferCents : undefined,
            maxSpreadCents: maxSpreadCents != null ? maxSpreadCents : undefined,
            minDepthPct: minDepthPct != null ? minDepthPct : undefined,
            minSecToHedge,
            hedgeIgnoreSpread,
            panicHedgeEnabled,
            panicHedgeStartSec,
            panicMaxLossCents,
        };
    }, [pollMs, minProb, amountUsd, simEnabled, simInitialUsdc, entryEndSec, entryStartSec, cheapMinCents, cheapMaxCents, targetProfitCents, profitDecayEnabled, profitDecayMode, profitDecayPerMinCents, profitStartCents, profitEndCents, profitDecayStartSec, profitDecayEndSec, profitStepCents, mode, bufferCents, maxSpreadCents, minDepthPct, minSecToHedge, hedgeIgnoreSpread, panicHedgeEnabled, panicHedgeStartSec, panicMaxLossCents]);

    const hydrateFromConfig = (cfg: any) => {
        if (!cfg) return;
        if (cfg.pollMs != null) setPollMs(Number(cfg.pollMs));
        if (cfg.minProb != null) setMinProb(Number(cfg.minProb));
        if (cfg.amountUsd != null) setAmountUsd(Number(cfg.amountUsd));
        if (cfg.simEnabled != null) setSimEnabled(!!cfg.simEnabled);
        if (cfg.simInitialUsdc != null) setSimInitialUsdc(Number(cfg.simInitialUsdc));
        if (cfg.entryCheapMinCents != null) setCheapMinCents(Number(cfg.entryCheapMinCents));
        if (cfg.entryCheapMaxCents != null) setCheapMaxCents(Number(cfg.entryCheapMaxCents));
        if (cfg.targetProfitCents != null) setTargetProfitCents(Number(cfg.targetProfitCents));
        if (cfg.profitDecayEnabled != null) setProfitDecayEnabled(!!cfg.profitDecayEnabled);
        if (cfg.profitDecayMode != null) setProfitDecayMode(String(cfg.profitDecayMode) === 'per_minute' ? 'per_minute' : 'linear');
        if (cfg.profitDecayPerMinCents != null) setProfitDecayPerMinCents(Number(cfg.profitDecayPerMinCents));
        if (cfg.profitStartCents != null) setProfitStartCents(Number(cfg.profitStartCents));
        if (cfg.profitEndCents != null) setProfitEndCents(Number(cfg.profitEndCents));
        if (cfg.profitDecayStartSec != null) setProfitDecayStartSec(Number(cfg.profitDecayStartSec));
        if (cfg.profitDecayEndSec != null) setProfitDecayEndSec(Number(cfg.profitDecayEndSec));
        if (cfg.profitStepCents != null) setProfitStepCents(Number(cfg.profitStepCents));
        if (cfg.mode != null) setMode(String(cfg.mode) as any);
        if (cfg.bufferCents != null) setBufferCents(Number(cfg.bufferCents));
        if (cfg.maxSpreadCents != null) setMaxSpreadCents(Number(cfg.maxSpreadCents));
        if (cfg.minDepthPct != null) setMinDepthPct(Number(cfg.minDepthPct));
        if (cfg.minSecToHedge != null) setMinSecToHedge(Number(cfg.minSecToHedge));
        if (cfg.hedgeIgnoreSpread != null) setHedgeIgnoreSpread(!!cfg.hedgeIgnoreSpread);
        if (cfg.panicHedgeEnabled != null) setPanicHedgeEnabled(!!cfg.panicHedgeEnabled);
        if (cfg.panicHedgeStartSec != null) setPanicHedgeStartSec(Number(cfg.panicHedgeStartSec));
        if (cfg.panicMaxLossCents != null) setPanicMaxLossCents(Number(cfg.panicMaxLossCents));
        if (cfg.entryRemainingMinSec != null) setEntryEndSec(Number(cfg.entryRemainingMinSec));
        if (cfg.entryRemainingMaxSec != null) setEntryStartSec(Number(cfg.entryRemainingMaxSec));
    };

    const fetchSignals = async () => {
        const r = await apiGet('signals', '/group-arb/crypto15m-hedge/signals');
        const s = r?.data?.status ?? null;
        setStatus(s);
        if (!editingRef.current) hydrateFromConfig(s?.config ?? null);
        const es = r?.data?.entrySignals ?? [];
        const hs = r?.data?.hedgeSignals ?? [];
        const opp = r?.data?.opportunities ?? [];
        setEntrySignals(Array.isArray(es) ? es : []);
        setHedgeSignals(Array.isArray(hs) ? hs : []);
        setOpportunities(Array.isArray(opp) ? opp : []);
    };

    const fetchHistory = async () => {
        const r = await apiGet('history', '/group-arb/crypto15m-hedge/history', { params: { maxEntries: 50 } });
        const h = r?.data?.history ?? [];
        setHistory(Array.isArray(h) ? h : []);
    };

    const fetchPnl = async (r: Range) => {
        setPnlLoading(true);
        try {
            const [a, b] = await Promise.allSettled([
                apiGet('pnl', '/group-arb/pnl', { params: { range: r } }),
                apiGet('sim_pnl', '/group-arb/crypto15m-hedge/pnl', { params: { range: r } }),
            ]);
            if (a.status === 'fulfilled') setPnl(a.value?.data ?? null);
            if (a.status === 'rejected') setPnl(null);
            if (b.status === 'fulfilled') setSimPnl(b.value?.data ?? null);
            if (b.status === 'rejected') setSimPnl(null);
        } finally {
            setPnlLoading(false);
        }
    };

    const refreshAll = async (options?: { silent?: boolean }) => {
        const silent = options?.silent === true;
        if (!silent) setRefreshLoading(true);
        try {
            await Promise.all([fetchSignals(), fetchHistory(), fetchPnl(range)]);
        } finally {
            if (!silent) setRefreshLoading(false);
        }
    };

    const startAuto = async () => {
        setStartLoading(true);
        try {
            const r = await apiPost('start', '/group-arb/crypto15m-hedge/auto/start', configBody);
            const s = r?.data?.status ?? null;
            setStatus(s);
            hydrateFromConfig(s?.config ?? null);
            message.success('Crypto15M Hedge 已啟動');
            await Promise.all([fetchSignals(), fetchHistory()]);
        } finally {
            setStartLoading(false);
        }
    };

    const stopAuto = async () => {
        setStopLoading(true);
        try {
            const r = await apiPost('stop', '/group-arb/crypto15m-hedge/auto/stop');
            const s = r?.data?.status ?? null;
            setStatus(s);
            hydrateFromConfig(s?.config ?? null);
            message.success('Crypto15M Hedge 已停止');
            await Promise.all([fetchSignals(), fetchHistory()]);
        } finally {
            setStopLoading(false);
        }
    };

    const saveConfig = async () => {
        setRefreshLoading(true);
        try {
            const r = await apiPost('config', '/group-arb/crypto15m-hedge/config', configBody);
            const s = r?.data?.status ?? null;
            setStatus(s);
            hydrateFromConfig(s?.config ?? null);
            message.success('設定已保存');
            await Promise.all([fetchSignals(), fetchHistory()]);
        } finally {
            setRefreshLoading(false);
        }
    };

    useEffect(() => {
        for (const c of abortersRef.current.values()) {
            try { c.abort(); } catch {}
        }
        abortersRef.current.clear();
        setStatus(null);
        setEntrySignals([]);
        setHedgeSignals([]);
        setOpportunities([]);
        setHistory([]);
        refreshAll().catch(() => {});
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [apiPath]);

    useEffect(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (!autoRefresh) return;
        timerRef.current = setInterval(() => {
            if (editingRef.current) return;
            refreshAll({ silent: true }).catch(() => {});
        }, Math.max(500, Math.floor(Number(pollMs) || 2000)));
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [apiPath, autoRefresh, pollMs]);

    useEffect(() => {
        fetchPnl(range).catch(() => {});
    }, [apiPath, range]);

    const windowMidSec = useMemo(() => {
        const minSec = Math.max(0, Math.min(900, Math.floor(Number(entryEndSec))));
        const maxSec = Math.max(minSec, Math.min(900, Math.floor(Number(entryStartSec))));
        return Math.floor((minSec + maxSec) / 2);
    }, [entryEndSec, entryStartSec]);

    const opportunitiesView = useMemo(() => {
        const list = Array.isArray(opportunities) ? opportunities : [];
        if (showAllPeriods) return list;
        const grouped = new Map<string, any[]>();
        for (const x of list) {
            const sym = String(x?.symbol || '').toUpperCase();
            if (!sym) continue;
            const arr = grouped.get(sym) || [];
            arr.push(x);
            grouped.set(sym, arr);
        }
        const picked: any[] = [];
        for (const [, arr] of grouped.entries()) {
            const sorted = [...arr].sort((a, b) => {
                if (!!a.entryEligible !== !!b.entryEligible) return a.entryEligible ? -1 : 1;
                if (!!a.secondEligibleNow !== !!b.secondEligibleNow) return a.secondEligibleNow ? -1 : 1;
                const as = a?.secondsToExpire != null ? Number(a.secondsToExpire) : Infinity;
                const bs = b?.secondsToExpire != null ? Number(b.secondsToExpire) : Infinity;
                const da = Math.abs(as - windowMidSec);
                const db = Math.abs(bs - windowMidSec);
                return da - db;
            });
            if (sorted.length) picked.push(sorted[0]);
        }
        return picked.sort((a, b) => String(a?.symbol || '').localeCompare(String(b?.symbol || '')));
    }, [opportunities, showAllPeriods, windowMidSec]);

    const entrySignalsView = useMemo(() => {
        const list = Array.isArray(entrySignals) ? entrySignals : [];
        if (showAllPeriods) return list;
        const grouped = new Map<string, any[]>();
        for (const x of list) {
            const sym = String(x?.symbol || '').toUpperCase();
            if (!sym) continue;
            const arr = grouped.get(sym) || [];
            arr.push(x);
            grouped.set(sym, arr);
        }
        const picked: any[] = [];
        for (const [, arr] of grouped.entries()) {
            const sorted = [...arr].sort((a, b) => {
                if (!!a.entryEligible !== !!b.entryEligible) return a.entryEligible ? -1 : 1;
                const as = a?.secondsToExpire != null ? Number(a.secondsToExpire) : Infinity;
                const bs = b?.secondsToExpire != null ? Number(b.secondsToExpire) : Infinity;
                const da = Math.abs(as - windowMidSec);
                const db = Math.abs(bs - windowMidSec);
                return da - db;
            });
            if (sorted.length) picked.push(sorted[0]);
        }
        return picked.sort((a, b) => String(a?.symbol || '').localeCompare(String(b?.symbol || '')));
    }, [entrySignals, showAllPeriods, windowMidSec]);

    const activesList = useMemo(() => {
        const a = status?.actives || {};
        return Object.keys(a).map(k => ({ symbol: k, ...(a[k] || {}) }));
    }, [status]);

    const historyView = useMemo(() => {
        const list = Array.isArray(history) ? history : [];
        if (historyFilter === 'attempts') return list.filter((x) => String(x?.action || '') === 'crypto15m_hedge_attempt');
        if (historyFilter === 'orders') return list.filter((x) => String(x?.action || '').startsWith('crypto15m_hedge_') && String(x?.action || '') !== 'crypto15m_hedge_attempt');
        return list;
    }, [history, historyFilter]);

    const ordersView = useMemo(() => {
        const list = Array.isArray(history) ? history : [];
        return list.filter((x) => {
            const a = String(x?.action || '');
            if (!a.startsWith('crypto15m_hedge_')) return false;
            if (a === 'crypto15m_hedge_attempt') return false;
            if (a === 'crypto15m_hedge_config_update') return false;
            if (a === 'crypto15m_hedge_auto_start' || a === 'crypto15m_hedge_auto_stop') return false;
            return true;
        });
    }, [history]);

    const reasonsAgg = useMemo(() => {
        const list = Array.isArray(history) ? history : [];
        const map = new Map<string, { reason: string; count: number; lastAt: string | null; sample: any | null }>();
        for (const e of list) {
            const action = String(e?.action || '');
            if (!(action === 'crypto15m_hedge_attempt' || action === 'crypto15m_hedge_skip')) continue;
            const reason = String(e?.reason || 'unknown');
            const prev = map.get(reason) || { reason, count: 0, lastAt: null as any, sample: null as any };
            prev.count += 1;
            const ts = e?.timestamp != null ? String(e.timestamp) : null;
            if (ts && (!prev.lastAt || ts > prev.lastAt)) {
                prev.lastAt = ts;
                prev.sample = e;
            }
            map.set(reason, prev);
        }
        return Array.from(map.values()).sort((a, b) => (b.count - a.count));
    }, [history]);

    const ordersSummary = useMemo(() => {
        const list = ordersView;
        const total = list.length;
        const ok = list.filter((x) => x?.success === true).length;
        const fail = list.filter((x) => x?.success === false).length;
        const byAction = list.reduce((acc: any, x: any) => {
            const a = String(x?.action || 'unknown');
            if (!acc[a]) acc[a] = { action: a, total: 0, ok: 0, fail: 0 };
            acc[a].total += 1;
            if (x?.success === true) acc[a].ok += 1;
            if (x?.success === false) acc[a].fail += 1;
            return acc;
        }, {});
        const rows = Object.values(byAction).sort((a: any, b: any) => (b.total - a.total));
        return { total, ok, fail, rows };
    }, [ordersView]);

    const pnlSummary = useMemo(() => {
        const portfolioPl = pnl?.profitLoss != null ? Number(pnl.profitLoss) : null;
        const portfolioSeries = Array.isArray(pnl?.series) ? pnl.series : [];
        const portfolioEquity = portfolioSeries.length ? Number(portfolioSeries[portfolioSeries.length - 1]?.equity) : null;
        const simPl = simPnl?.profitLoss != null ? Number(simPnl.profitLoss) : null;
        const simSeries = Array.isArray(simPnl?.series) ? simPnl.series : [];
        const simEquity = simSeries.length ? Number(simSeries[simSeries.length - 1]?.equity) : null;
        const fromSec = pnl?.fromSec != null ? Number(pnl.fromSec) : (simPnl?.fromSec != null ? Number(simPnl.fromSec) : null);
        const tradesInRange = fromSec != null
            ? ordersView.filter((x: any) => {
                const ts = x?.timestamp ? Date.parse(String(x.timestamp)) : NaN;
                if (!Number.isFinite(ts)) return false;
                return Math.floor(ts / 1000) >= fromSec;
            }).length
            : ordersView.length;
        return { portfolioPl, portfolioEquity, simPl, simEquity, tradesInRange };
    }, [pnl, simPnl, ordersView]);

    return (
        <div>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Title level={3} style={{ color: '#fff', margin: 0 }}>Crypto15M Hedge</Title>

                {status?.lastError ? <Alert type="error" showIcon message={String(status.lastError)} /> : null}
                {!status?.hasValidKey ? <Alert type="warning" showIcon message="未檢測到私鑰/Trading 未初始化，Auto 會停止" /> : null}

                <Card size="small" style={{ background: '#1f1f1f', borderColor: '#333' }}>
                    <div onFocusCapture={beginEditing} onBlurCapture={endEditingSoon} onKeyDownCapture={bumpEditing} onMouseDownCapture={bumpEditing}>
                    <Space wrap>
                        <Tag color={enabled ? 'green' : 'red'}>{enabled ? 'AUTO ON' : 'AUTO OFF'}</Tag>
                        <Tag color="blue">entry={entryStartSec}s→{entryEndSec}s</Tag>
                        <Tag color="gold">cheap={cheapMinCents}-{cheapMaxCents}c</Tag>
                        <Tag color="purple">
                            {profitDecayEnabled
                                ? `profit=${Number(profitStartCents).toFixed(1)}→${Number(profitEndCents).toFixed(1)}c@${Math.floor(Number(profitDecayStartSec))}→${Math.floor(Number(profitDecayEndSec))}s(${profitDecayMode}${profitDecayMode === 'per_minute' ? `,${Number(profitDecayPerMinCents).toFixed(2)}/m` : ''})`
                                : `profit=${targetProfitCents}c`
                            }
                        </Tag>
                        <Tag color="cyan">mode={mode}</Tag>
                        {status?.sim?.enabled ? (
                            <>
                                <Tag color="geekblue">cap=${Number(status.sim.initialUsdc).toFixed(2)}</Tag>
                                <Tag color="geekblue">eq=${Number(status.sim.equityUsdc).toFixed(2)}</Tag>
                                <Tag color={Number(status.sim.pnlUsdc) >= 0 ? 'green' : 'red'}>p/l=${Number(status.sim.pnlUsdc).toFixed(2)}</Tag>
                            </>
                        ) : null}
                    </Space>
                    <div style={{ marginTop: 12 }}>
                        <Space wrap>
                            <Button icon={<ReloadOutlined />} onClick={() => refreshAll()} loading={refreshLoading}>Refresh</Button>
                            <Button type="primary" icon={<PlayCircleOutlined />} onClick={startAuto} loading={startLoading} disabled={enabled}>Start</Button>
                            <Button danger icon={<PauseCircleOutlined />} onClick={stopAuto} loading={stopLoading} disabled={!enabled}>Stop</Button>
                            <Button onClick={() => setAutoRefresh(v => !v)}>{autoRefresh ? 'Auto Refresh: ON' : 'Auto Refresh: OFF'}</Button>
                            <Button onClick={saveConfig} loading={refreshLoading}>Save Config</Button>
                            <Button onClick={() => setShowAllPeriods(v => !v)}>{showAllPeriods ? 'Periods: ALL' : 'Periods: 1/Symbol'}</Button>
                            <Button
                                onClick={() => {
                                    setProfitDecayEnabled(true);
                                    setProfitDecayMode('per_minute');
                                    setProfitDecayPerMinCents(1);
                                    setProfitStartCents(10);
                                    setProfitEndCents(0);
                                    setProfitDecayStartSec(900);
                                    setProfitDecayEndSec(240);
                                    setProfitStepCents(0.1);
                                }}
                            >
                                Preset: 1c/min →240s
                            </Button>
                        </Space>
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <Space wrap>
                            <span style={{ color: '#aaa' }}>Amount($)</span>
                            <InputNumber min={1} value={amountUsd} onChange={(v) => setAmountUsd(Number(v))} />
                            <Checkbox checked={simEnabled} onChange={(e) => setSimEnabled(e.target.checked)}>Simulate</Checkbox>
                            {simEnabled ? (
                                <>
                                    <span style={{ color: '#aaa' }}>Capital($)</span>
                                    <InputNumber min={1} max={1000000} value={simInitialUsdc} onChange={(v) => setSimInitialUsdc(Number(v))} />
                                </>
                            ) : null}
                            <span style={{ color: '#aaa' }}>EntryStart(s)</span>
                            <InputNumber min={0} max={900} value={entryStartSec} onChange={(v) => setEntryStartSec(Number(v))} />
                            <span style={{ color: '#aaa' }}>EntryEnd(s)</span>
                            <InputNumber min={0} max={900} value={entryEndSec} onChange={(v) => setEntryEndSec(Number(v))} />
                            <Select
                                value={Math.round(Number(entryEndSec) / 60)}
                                onChange={(v) => setEntryEndSec(Math.max(0, Math.min(900, Math.floor(Number(v) * 60))))}
                                style={{ width: 120 }}
                                options={[
                                    { value: 5, label: '5m' },
                                    { value: 6, label: '6m' },
                                    { value: 7, label: '7m' },
                                    { value: 8, label: '8m' },
                                    { value: 9, label: '9m' },
                                    { value: 10, label: '10m' },
                                    { value: 11, label: '11m' },
                                    { value: 12, label: '12m' },
                                    { value: 13, label: '13m' },
                                    { value: 14, label: '14m' },
                                    { value: 15, label: '15m' },
                                ]}
                            />
                            <span style={{ color: '#aaa' }}>Cheap(c)</span>
                            <InputNumber min={1} max={49} value={cheapMinCents} onChange={(v) => setCheapMinCents(Number(v))} />
                            <span style={{ color: '#aaa' }}>~</span>
                            <InputNumber min={1} max={49} value={cheapMaxCents} onChange={(v) => setCheapMaxCents(Number(v))} />
                            <span style={{ color: '#aaa' }}>TargetProfit(c)</span>
                            <InputNumber min={1} max={30} value={targetProfitCents} onChange={(v) => setTargetProfitCents(Number(v))} />
                            <Checkbox checked={profitDecayEnabled} onChange={(e) => setProfitDecayEnabled(e.target.checked)}>ProfitDecay</Checkbox>
                            {profitDecayEnabled ? (
                                <>
                                    <span style={{ color: '#aaa' }}>Mode</span>
                                    <Select
                                        value={profitDecayMode}
                                        onChange={(v) => setProfitDecayMode(String(v) === 'per_minute' ? 'per_minute' : 'linear')}
                                        style={{ width: 130 }}
                                        options={[
                                            { value: 'linear', label: 'linear' },
                                            { value: 'per_minute', label: 'per_minute' },
                                        ]}
                                    />
                                    {profitDecayMode === 'per_minute' ? (
                                        <>
                                            <span style={{ color: '#aaa' }}>PerMin(c)</span>
                                            <InputNumber min={0.05} max={30} step={0.05} value={profitDecayPerMinCents} onChange={(v) => setProfitDecayPerMinCents(Number(v))} />
                                        </>
                                    ) : null}
                                    <span style={{ color: '#aaa' }}>PStart(c)</span>
                                    <InputNumber min={0} max={30} step={0.1} value={profitStartCents} onChange={(v) => setProfitStartCents(Number(v))} />
                                    <span style={{ color: '#aaa' }}>PEnd(c)</span>
                                    <InputNumber min={0} max={30} step={0.1} value={profitEndCents} onChange={(v) => setProfitEndCents(Number(v))} />
                                    <span style={{ color: '#aaa' }}>DStart(s)</span>
                                    <InputNumber min={0} max={900} step={5} value={profitDecayStartSec} onChange={(v) => setProfitDecayStartSec(Number(v))} />
                                    <span style={{ color: '#aaa' }}>DEnd(s)</span>
                                    <InputNumber min={0} max={900} step={5} value={profitDecayEndSec} onChange={(v) => setProfitDecayEndSec(Number(v))} />
                                    <span style={{ color: '#aaa' }}>Step(c)</span>
                                    <InputNumber min={0.05} max={5} step={0.05} value={profitStepCents} onChange={(v) => setProfitStepCents(Number(v))} />
                                </>
                            ) : null}
                            <span style={{ color: '#aaa' }}>Mode</span>
                            <Select
                                value={mode}
                                onChange={(v) => setMode(v)}
                                style={{ width: 140 }}
                                options={[
                                    { value: 'conservative', label: 'Conservative' },
                                    { value: 'balanced', label: 'Balanced' },
                                    { value: 'aggressive', label: 'Aggressive' },
                                ]}
                            />
                            <span style={{ color: '#aaa' }}>Poll(ms)</span>
                            <InputNumber min={250} max={120000} value={pollMs} onChange={(v) => setPollMs(Number(v))} />
                            <span style={{ color: '#aaa' }}>MinProb</span>
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
                            <span style={{ color: '#aaa' }}>MinSecToHedge</span>
                            <InputNumber min={0} max={900} value={minSecToHedge} onChange={(v) => setMinSecToHedge(Number(v))} />
                            <Checkbox checked={panicHedgeEnabled} onChange={(e) => setPanicHedgeEnabled(e.target.checked)}>PanicHedge</Checkbox>
                            {panicHedgeEnabled ? (
                                <>
                                    <span style={{ color: '#aaa' }}>PanicStart(s)</span>
                                    <InputNumber min={0} max={900} value={panicHedgeStartSec} onChange={(v) => setPanicHedgeStartSec(Number(v))} />
                                    <span style={{ color: '#aaa' }}>MaxLoss(c)</span>
                                    <InputNumber min={0} max={200} value={panicMaxLossCents} onChange={(v) => setPanicMaxLossCents(Number(v))} />
                                </>
                            ) : null}
                            <span style={{ color: '#aaa' }}>Buffer(c)</span>
                            <InputNumber min={0} max={10} step={0.1} value={bufferCents ?? undefined} onChange={(v) => setBufferCents(v == null ? null : Number(v))} />
                            <span style={{ color: '#aaa' }}>MaxSpread(c)</span>
                            <InputNumber min={0} max={50} value={maxSpreadCents ?? undefined} onChange={(v) => setMaxSpreadCents(v == null ? null : Number(v))} />
                            <Checkbox checked={hedgeIgnoreSpread} onChange={(e) => setHedgeIgnoreSpread(e.target.checked)}>IgnoreSpread</Checkbox>
                            <span style={{ color: '#aaa' }}>MinDepth(%)</span>
                            <InputNumber min={0} max={100} value={minDepthPct ?? undefined} onChange={(v) => setMinDepthPct(v == null ? null : Number(v))} />
                        </Space>
                    </div>
                    </div>
                </Card>

                <Card
                    size="small"
                    title={<span style={{ color: '#fff' }}>P/L (Day / Week / Month / All)</span>}
                    style={{ background: '#1f1f1f', borderColor: '#333' }}
                    extra={
                        <Space>
                            <Select
                                value={range}
                                onChange={(v) => setRange(v)}
                                style={{ width: 120 }}
                                options={[
                                    { value: '1D', label: '1D' },
                                    { value: '1W', label: '1W' },
                                    { value: '1M', label: '1M' },
                                    { value: 'ALL', label: 'ALL' },
                                ]}
                            />
                            <Button icon={<ReloadOutlined />} onClick={() => fetchPnl(range)} loading={pnlLoading}>Refresh</Button>
                        </Space>
                    }
                >
                    <Space wrap>
                        <Tag color="geekblue">trades={pnlSummary.tradesInRange}</Tag>
                        <Tag color={pnlSummary.portfolioPl != null && pnlSummary.portfolioPl >= 0 ? 'green' : 'red'}>
                            portfolio p/l={pnlSummary.portfolioPl != null ? Number(pnlSummary.portfolioPl).toFixed(2) : '-'}
                        </Tag>
                        <Tag color="geekblue">portfolio eq={pnlSummary.portfolioEquity != null && Number.isFinite(pnlSummary.portfolioEquity) ? Number(pnlSummary.portfolioEquity).toFixed(2) : '-'}</Tag>
                        <Tag color={pnlSummary.simPl != null && pnlSummary.simPl >= 0 ? 'green' : 'red'}>
                            sim p/l={pnlSummary.simPl != null ? Number(pnlSummary.simPl).toFixed(2) : '-'}
                        </Tag>
                        <Tag color="geekblue">sim eq={pnlSummary.simEquity != null && Number.isFinite(pnlSummary.simEquity) ? Number(pnlSummary.simEquity).toFixed(2) : '-'}</Tag>
                    </Space>
                </Card>

                <Card size="small" title={<span style={{ color: '#fff' }}>Opportunities (1st + 2nd)</span>} style={{ background: '#1f1f1f', borderColor: '#333' }}>
                    <Table
                        rowKey={(r) => String(r.conditionId || `${r.symbol}-${r.secondsToExpire}`)}
                        size="small"
                        pagination={false}
                        dataSource={opportunitiesView}
                        columns={[
                            { title: 'Symbol', dataIndex: 'symbol', key: 'symbol', width: 90, render: (v) => <Tag color="blue">{String(v)}</Tag> },
                            { title: 'Sec', dataIndex: 'secondsToExpire', key: 'secondsToExpire', width: 90, render: (v) => v != null ? String(v) : '-' },
                            { title: '1st', key: 'first', width: 220, render: (_: any, r: any) => `${String(r.entryOutcome || '-')}: ${r.entryBestAsk != null ? (Number(r.entryBestAsk) * 100).toFixed(1) : '-'}c` },
                            { title: '1stOK', dataIndex: 'entryEligible', key: 'entryEligible', width: 90, render: (v) => v ? <Tag color="green">YES</Tag> : <Tag>NO</Tag> },
                            { title: '2nd', key: 'second', width: 220, render: (_: any, r: any) => `${String(r.hedgeOutcome || '-')}: ${r.hedgeBestAsk != null ? (Number(r.hedgeBestAsk) * 100).toFixed(1) : '-'}c` },
                            { title: '2ndOK', dataIndex: 'secondEligibleNow', key: 'secondEligibleNow', width: 90, render: (v) => v ? <Tag color="green">YES</Tag> : <Tag>NO</Tag> },
                            { title: 'EffP', dataIndex: 'effectiveProfitCents', key: 'effectiveProfitCents', width: 90, render: (v) => v != null ? `${Number(v).toFixed(1)}c` : '-' },
                            { title: 'p2Max', dataIndex: 'p2Max', key: 'p2Max', width: 110, render: (v) => v != null ? `${(Number(v) * 100).toFixed(1)}c` : '-' },
                            { title: 'State', key: 'state', width: 110, render: (_: any, r: any) => {
                                const s = String(r.state || 'mixed');
                                const color = s === 'trend_up' ? 'green' : s === 'trend_down' ? 'red' : s === 'range' ? 'gold' : 'blue';
                                return <Tag color={color}>{s}</Tag>;
                            } },
                            { title: 'RiskUp', dataIndex: 'riskUp', key: 'riskUp', width: 90, render: (v) => v != null ? Number(v).toFixed(0) : '-' },
                            { title: 'RiskDown', dataIndex: 'riskDown', key: 'riskDown', width: 100, render: (v) => v != null ? Number(v).toFixed(0) : '-' },
                            { title: 'Body', dataIndex: 'bodyRatio', key: 'bodyRatio', width: 90, render: (v) => v != null ? (Number(v) * 100).toFixed(0) + '%' : '-' },
                            { title: 'Wick', dataIndex: 'wickRatio', key: 'wickRatio', width: 90, render: (v) => v != null ? (Number(v) * 100).toFixed(0) + '%' : '-' },
                            { title: 'Mom3m', dataIndex: 'momentum3m', key: 'momentum3m', width: 100, render: (v) => v != null ? (Number(v) * 100).toFixed(2) + '%' : '-' },
                            { title: 'EstShr', dataIndex: 'estEntryShares', key: 'estEntryShares', width: 90, render: (v) => v != null ? Number(v).toFixed(2) : '-' },
                            { title: 'Tradable', dataIndex: 'tradableShares', key: 'tradableShares', width: 90, render: (v) => v != null ? Number(v).toFixed(2) : '-' },
                            { title: 'Reason', key: 'reason', render: (_: any, r: any) => String(r.secondReason || r.entryReason || '-') },
                        ]}
                    />
                </Card>

                <Card size="small" title={<span style={{ color: '#fff' }}>Entry Signals (8–15c 可入)</span>} style={{ background: '#1f1f1f', borderColor: '#333' }}>
                    <Table
                        rowKey={(r) => String(r.conditionId || r.symbol)}
                        size="small"
                        pagination={false}
                        dataSource={entrySignalsView.slice(0, 30)}
                        columns={[
                            { title: 'Symbol', dataIndex: 'symbol', key: 'symbol', width: 90, render: (v) => <Tag color="blue">{String(v)}</Tag> },
                            { title: 'Sec', dataIndex: 'secondsToExpire', key: 'secondsToExpire', width: 90, render: (v) => v != null ? String(v) : '-' },
                            { title: 'Outcome', dataIndex: 'entryOutcome', key: 'entryOutcome', width: 140, render: (v) => String(v || '-') },
                            { title: 'BestAsk', dataIndex: 'bestAsk', key: 'bestAsk', width: 110, render: (v) => v != null ? `${(Number(v) * 100).toFixed(1)}c` : '-' },
                            { title: 'Spread', dataIndex: 'spreadCents', key: 'spreadCents', width: 110, render: (v) => v != null ? `${Number(v).toFixed(1)}c` : '-' },
                            { title: 'Eligible', dataIndex: 'entryEligible', key: 'entryEligible', width: 110, render: (v) => v ? <Tag color="green">YES</Tag> : <Tag>NO</Tag> },
                            { title: 'Reason', dataIndex: 'reason', key: 'reason', render: (v) => v ? String(v) : '-' },
                        ]}
                    />
                </Card>

                <Card size="small" title={<span style={{ color: '#fff' }}>Hedge Signals (自動入第二腿)</span>} style={{ background: '#1f1f1f', borderColor: '#333' }}>
                    <Table
                        rowKey={(r) => String(r.symbol || r.conditionId)}
                        size="small"
                        pagination={false}
                        dataSource={hedgeSignals}
                        columns={[
                            { title: 'Symbol', dataIndex: 'symbol', key: 'symbol', width: 90, render: (v) => <Tag color="blue">{String(v)}</Tag> },
                            { title: 'Phase', dataIndex: 'phase', key: 'phase', width: 140, render: (v) => <Tag color={String(v).includes('hedged') ? 'green' : 'gold'}>{String(v || '-')}</Tag> },
                            { title: 'Sec', dataIndex: 'secondsToExpire', key: 'secondsToExpire', width: 90, render: (v) => v != null ? String(v) : '-' },
                            { title: 'Entry', dataIndex: 'entryPrice', key: 'entryPrice', width: 110, render: (v) => v != null ? `${(Number(v) * 100).toFixed(1)}c` : '-' },
                            { title: 'EffP', dataIndex: 'effectiveProfitCents', key: 'effectiveProfitCents', width: 90, render: (v) => v != null ? `${Number(v).toFixed(1)}c` : '-' },
                            { title: 'p2Max', dataIndex: 'p2Max', key: 'p2Max', width: 110, render: (v) => v != null ? `${(Number(v) * 100).toFixed(1)}c` : '-' },
                            { title: 'BestAsk', dataIndex: 'bestAsk', key: 'bestAsk', width: 110, render: (v) => v != null ? `${(Number(v) * 100).toFixed(1)}c` : '-' },
                            { title: 'Tradable', dataIndex: 'tradableShares', key: 'tradableShares', width: 110, render: (v) => v != null ? Number(v).toFixed(2) : '-' },
                            { title: 'Eligible', dataIndex: 'hedgeEligible', key: 'hedgeEligible', width: 110, render: (v) => v ? <Tag color="green">YES</Tag> : <Tag>NO</Tag> },
                            { title: 'Reason', dataIndex: 'reason', key: 'reason', render: (v) => v ? String(v) : '-' },
                        ]}
                    />
                </Card>

                <Card size="small" title={<span style={{ color: '#fff' }}>Actives</span>} style={{ background: '#1f1f1f', borderColor: '#333' }}>
                    <Table
                        rowKey={(r) => String(r.conditionId || r.symbol)}
                        size="small"
                        pagination={false}
                        dataSource={activesList}
                        columns={[
                            { title: 'Symbol', dataIndex: 'symbol', key: 'symbol', width: 90, render: (v) => <Tag color="blue">{String(v)}</Tag> },
                            { title: 'Phase', dataIndex: 'phase', key: 'phase', width: 140, render: (v) => <Tag color={String(v).includes('hedged') ? 'green' : 'gold'}>{String(v || '-')}</Tag> },
                            { title: 'Entry', key: 'entry', render: (_: any, r: any) => `${(Number(r.entryPrice) * 100).toFixed(1)}c / $${Number(r.entryAmountUsd || 0).toFixed(2)} / ${String(r.entryOutcome || '-')}` },
                            { title: 'EntryShares', dataIndex: 'entryFilledShares', key: 'entryFilledShares', width: 120, render: (v) => Number(v || 0).toFixed(2) },
                            { title: 'HedgeShares', dataIndex: 'hedgeFilledShares', key: 'hedgeFilledShares', width: 120, render: (v) => Number(v || 0).toFixed(2) },
                            { title: 'End', dataIndex: 'endDate', key: 'endDate', render: (v) => String(v || '-') },
                        ]}
                    />
                </Card>

                <Card size="small" title={<span style={{ color: '#fff' }}>Assessment (Trades / Reasons)</span>} style={{ background: '#1f1f1f', borderColor: '#333' }}>
                    <Space wrap>
                        <Tag color="geekblue">orders={ordersSummary.total}</Tag>
                        <Tag color="green">ok={ordersSummary.ok}</Tag>
                        <Tag color="red">fail={ordersSummary.fail}</Tag>
                        <Tag color="gold">attempt/skip={reasonsAgg.reduce((a, b) => a + b.count, 0)}</Tag>
                    </Space>
                    <div style={{ marginTop: 12 }}>
                        <Table
                            rowKey={(r) => String(r.reason)}
                            size="small"
                            pagination={false}
                            dataSource={reasonsAgg.slice(0, 12)}
                            columns={[
                                { title: 'Reason', dataIndex: 'reason', key: 'reason', width: 220, render: (v) => <Tag>{String(v || '-')}</Tag> },
                                { title: 'Count', dataIndex: 'count', key: 'count', width: 90 },
                                { title: 'Last', dataIndex: 'lastAt', key: 'lastAt', width: 190, render: (v) => v ? String(v) : '-' },
                                {
                                    title: 'Sample',
                                    key: 'sample',
                                    render: (_: any, r: any) => {
                                        const s = r?.sample || null;
                                        if (!s) return '-';
                                        const parts: string[] = [];
                                        if (s.remainingSec != null) parts.push(`rem=${s.remainingSec}`);
                                        if (s.bestAsk != null) parts.push(`ask=${(Number(s.bestAsk) * 100).toFixed(1)}c`);
                                        if (s.p2Max != null) parts.push(`p2Max=${(Number(s.p2Max) * 100).toFixed(1)}c`);
                                        if (s.spreadCents != null) parts.push(`spr=${Number(s.spreadCents).toFixed(1)}c`);
                                        if (s.tradableShares != null) parts.push(`liq=${Number(s.tradableShares).toFixed(2)}`);
                                        if (s.errorMsg) parts.push(`err=${String(s.errorMsg).slice(0, 24)}`);
                                        return parts.length ? parts.join(' ') : '-';
                                    }
                                },
                            ]}
                        />
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <Table
                            rowKey={(r: any) => String(r.action)}
                            size="small"
                            pagination={false}
                            dataSource={ordersSummary.rows}
                            columns={[
                                { title: 'Action', dataIndex: 'action', key: 'action', width: 220, render: (v) => <Tag color="blue">{String(v)}</Tag> },
                                { title: 'Total', dataIndex: 'total', key: 'total', width: 90 },
                                { title: 'OK', dataIndex: 'ok', key: 'ok', width: 90, render: (v) => <span style={{ color: '#52c41a' }}>{Number(v)}</span> },
                                { title: 'FAIL', dataIndex: 'fail', key: 'fail', width: 90, render: (v) => <span style={{ color: '#ff4d4f' }}>{Number(v)}</span> },
                            ]}
                        />
                    </div>
                </Card>

                <Card
                    size="small"
                    title={<span style={{ color: '#fff' }}>History</span>}
                    style={{ background: '#1f1f1f', borderColor: '#333' }}
                    extra={
                        <Select
                            value={historyFilter}
                            onChange={(v) => setHistoryFilter(v)}
                            style={{ width: 160 }}
                            options={[
                                { value: 'all', label: 'All' },
                                { value: 'attempts', label: 'Attempts' },
                                { value: 'orders', label: 'Orders' },
                            ]}
                        />
                    }
                >
                    <Table
                        rowKey={(r) => String(r.id || `${r.timestamp}-${r.action}`)}
                        size="small"
                        pagination={false}
                        dataSource={historyView}
                        columns={[
                            { title: 'Time', dataIndex: 'timestamp', key: 'timestamp', width: 190, render: (v) => String(v || '-') },
                            {
                                title: 'Action',
                                dataIndex: 'action',
                                key: 'action',
                                width: 180,
                                render: (v) => {
                                    const s = String(v || '-');
                                    const color =
                                        s === 'crypto15m_hedge_attempt' ? 'gold'
                                        : s === 'crypto15m_hedge_buy' ? 'green'
                                        : s === 'crypto15m_hedge_entry' ? 'cyan'
                                        : s === 'crypto15m_hedge_skip' ? 'orange'
                                        : undefined;
                                    return <Tag color={color}>{s}</Tag>;
                                }
                            },
                            { title: 'Symbol', dataIndex: 'symbol', key: 'symbol', width: 90, render: (v) => v ? <Tag color="blue">{String(v)}</Tag> : '-' },
                            { title: 'Rem', dataIndex: 'remainingSec', key: 'remainingSec', width: 80, render: (v) => v != null ? String(v) : '-' },
                            { title: 'Reason', dataIndex: 'reason', key: 'reason', width: 160, render: (v) => v ? String(v) : '-' },
                            { title: 'Panic', dataIndex: 'panicNow', key: 'panicNow', width: 90, render: (v) => v ? <Tag color="red">YES</Tag> : '-' },
                            { title: 'BestAsk', dataIndex: 'bestAsk', key: 'bestAsk', width: 100, render: (v) => v != null ? `${(Number(v) * 100).toFixed(1)}c` : '-' },
                            { title: 'BestBid', dataIndex: 'bestBid', key: 'bestBid', width: 100, render: (v) => v != null ? `${(Number(v) * 100).toFixed(1)}c` : '-' },
                            { title: 'Spr', dataIndex: 'spreadCents', key: 'spreadCents', width: 80, render: (v) => v != null ? `${Number(v).toFixed(1)}c` : '-' },
                            { title: 'MaxSpr', dataIndex: 'maxSpreadCents', key: 'maxSpreadCents', width: 90, render: (v) => v != null ? `${Number(v).toFixed(0)}c` : '-' },
                            { title: 'p2Max', dataIndex: 'p2Max', key: 'p2Max', width: 100, render: (v) => v != null ? `${(Number(v) * 100).toFixed(1)}c` : '-' },
                            { title: 'Order', dataIndex: 'orderId', key: 'orderId', width: 140, render: (v) => v ? String(v).slice(0, 10) : '-' },
                            { title: 'Filled', dataIndex: 'filledSize', key: 'filledSize', width: 90, render: (v) => v != null ? Number(v).toFixed(2) : '-' },
                            { title: 'Result', key: 'result', render: (_: any, r: any) => r?.success === true ? <Tag color="green">OK</Tag> : r?.success === false ? <Tag color="red">FAIL</Tag> : '-' },
                            { title: 'Error', dataIndex: 'errorMsg', key: 'errorMsg', render: (v) => v ? String(v).slice(0, 60) : '-' },
                        ]}
                    />
                </Card>
            </Space>
        </div>
    );
}

export default Crypto15mHedge;
