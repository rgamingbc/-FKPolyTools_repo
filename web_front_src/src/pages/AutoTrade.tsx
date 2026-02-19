import { useContext, useEffect, useState } from 'react';
import { Alert, Button, Card, Descriptions, Tag } from 'antd';
import api from '../api/client';
import { AccountContext } from '../account/AccountContext';

export default function AutoTrade() {
    const { activeAccountId } = useContext(AccountContext);
    const scope = String(activeAccountId || 'default').trim() || 'default';
    const enabledKey = `auto_trade_enabled:${scope}`;
    const [enabled, setEnabled] = useState(false);
    const [status, setStatus] = useState<any>(null);
    useEffect(() => {
        setEnabled(false);
        try {
            const legacyKey = 'auto_trade_enabled';
            const raw = localStorage.getItem(enabledKey);
            const legacy = localStorage.getItem(legacyKey);
            const next = raw != null ? raw : legacy;
            if (!raw && legacy) {
                try { localStorage.setItem(enabledKey, legacy); } catch {}
            }
            setEnabled(String(next || '').trim() === 'true');
        } catch {
            setEnabled(false);
        }
    }, [enabledKey]);

    const toggle = (v: boolean) => {
        setEnabled(v);
        try {
            localStorage.setItem(enabledKey, v ? 'true' : 'false');
        } catch {
        }
    };

    const refreshStatus = async () => {
        try {
            const res = await api.get('/group-arb/status');
            setStatus(res.data.status);
        } catch {
            setStatus(null);
        }
    };

    useEffect(() => {
        refreshStatus();
    }, []);

    return (
        <div style={{ padding: 24 }}>
            <Card title="🤖 自動交易 (Auto Trade)">
                <Alert
                    type="warning"
                    showIcon
                    message="OFF by default"
                    description="This page is the control surface for Strategy I (TDL) auto mode. Keep it disabled until you are comfortable with semi-auto performance."
                    style={{ marginBottom: 16 }}
                />

                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                    <Tag color={enabled ? 'green' : 'red'}>{enabled ? 'ENABLED' : 'DISABLED'}</Tag>
                    <Button type={enabled ? 'default' : 'primary'} danger={enabled} onClick={() => toggle(!enabled)}>
                        {enabled ? 'Disable Auto Trade' : 'Enable Auto Trade'}
                    </Button>
                    <Button onClick={refreshStatus}>Refresh API Status</Button>
                </div>

                <Descriptions bordered size="small" column={1}>
                    <Descriptions.Item label="Strategy">TDL (Twin‑Leg Discount Ladder)</Descriptions.Item>
                    <Descriptions.Item label="API">
                        {status?.ok ? <Tag color="green">OK</Tag> : <Tag color="red">Not OK</Tag>}
                    </Descriptions.Item>
                    <Descriptions.Item label="Funder">{status?.funder || '-'}</Descriptions.Item>
                </Descriptions>
            </Card>
        </div>
    );
}
