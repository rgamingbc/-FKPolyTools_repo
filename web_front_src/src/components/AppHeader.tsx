import { Layout, Select, Space, Typography, Tooltip } from 'antd';
import { LineChartOutlined } from '@ant-design/icons';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { AccountContext } from '../account/AccountContext';

const { Header } = Layout;
const { Title, Text } = Typography;

function AppHeader() {
    const { activeAccountId, setActiveAccountId } = useContext(AccountContext);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [stateDir, setStateDir] = useState<string>('');

    const fetchAccounts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/accounts');
            const list = Array.isArray(res.data?.accounts) ? res.data.accounts : [];
            setAccounts(list);
            const dir = res.data?.stateDir != null ? String(res.data.stateDir) : '';
            setStateDir(dir);
        } catch {
            setAccounts([]);
            setStateDir('');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    useEffect(() => {
        const onAccountsChanged = () => {
            fetchAccounts();
        };
        window.addEventListener('pm_accounts_changed', onAccountsChanged);
        return () => {
            window.removeEventListener('pm_accounts_changed', onAccountsChanged);
        };
    }, [fetchAccounts]);

    useEffect(() => {
        const id = String(activeAccountId || '').trim();
        if (!id || id === 'default' || id === 'simulation') return;
        const exists = (accounts || []).some((a: any) => String(a?.id || '').trim() === id);
        if (!exists) fetchAccounts();
    }, [activeAccountId, accounts, fetchAccounts]);

    const options = useMemo(() => {
        const list = Array.isArray(accounts) ? accounts : [];
        const items = list.map((a: any) => {
            const id = String(a?.id || '').trim() || 'default';
            const name = String(a?.name || id);
            const funder = String(a?.status?.funderAddress || '');
            const label = funder ? `${name} (${funder.slice(0, 6)}…${funder.slice(-4)})` : name;
            return { value: id, label };
        });
        // Always ensure 'default' and 'simulation' exist
        if (!items.find(x => x.value === 'default')) {
            items.unshift({ value: 'default', label: 'Default Account (Real)' });
        }
        if (!items.find(x => x.value === 'simulation')) {
            items.push({ value: 'simulation', label: 'Simulation Account (Mock)' });
        }
        const cur = String(activeAccountId || '').trim();
        if (cur && !items.find(x => x.value === cur)) {
            items.unshift({ value: cur, label: cur });
        }
        return items;
    }, [accounts, activeAccountId]);

    return (
        <Header
            style={{
                background: '#1f1f1f',
                borderBottom: '1px solid #333',
                display: 'flex',
                alignItems: 'center',
                padding: '0 24px',
            }}
        >
            <LineChartOutlined style={{ fontSize: 24, color: '#1890ff', marginRight: 12 }} />
            <Title level={4} style={{ margin: 0, color: '#fff' }}>
                FK Polymarket Tools
            </Title>
            {stateDir ? (
                <Tooltip title={stateDir}>
                    <Text style={{ color: '#888', marginLeft: 12, maxWidth: 420 }} ellipsis>
                        {stateDir}
                    </Text>
                </Tooltip>
            ) : null}
            <div style={{ flex: 1 }} />
            <Space>
                <Select
                    showSearch
                    style={{ width: 320, maxWidth: '60vw' }}
                    loading={loading}
                    value={activeAccountId}
                    onChange={(v) => setActiveAccountId(String(v || 'default'))}
                    options={options}
                    placeholder="Account"
                    filterOption={(input, option) => String((option as any)?.label || '').toLowerCase().includes(String(input || '').toLowerCase())}
                />
            </Space>
        </Header>
    );
}

export default AppHeader;
