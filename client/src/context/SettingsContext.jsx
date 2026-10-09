import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, getMode } from '../api';
import { money } from '../utils/format';

const DEFAULTS = {
  shopName: 'Pizza Shop',
  currencySymbol: '₹',
  taxRate: 0,
  deliveryFee: 0,
  freeDeliveryOver: 0,
};

const SettingsContext = createContext({ ...DEFAULTS, localMode: false, fmt: (n) => money(n) });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);
  const [localMode, setLocalMode] = useState(false);

  useEffect(() => {
    getMode().then((mode) => setLocalMode(mode === 'local'));
    api('/settings')
      .then((s) => setSettings({ ...DEFAULTS, ...s }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.title = settings.shopName;
  }, [settings.shopName]);

  const value = useMemo(
    () => ({ ...settings, localMode, fmt: (n) => money(n, settings.currencySymbol) }),
    [settings, localMode]
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
