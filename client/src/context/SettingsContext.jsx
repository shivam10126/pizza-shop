import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { money } from '../utils/format';

const DEFAULTS = {
  shopName: 'Pizza Shop',
  currencySymbol: '₹',
  taxRate: 0,
  deliveryFee: 0,
  freeDeliveryOver: 0,
};

const SettingsContext = createContext({ ...DEFAULTS, fmt: (n) => money(n) });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);

  useEffect(() => {
    api('/settings')
      .then((s) => setSettings({ ...DEFAULTS, ...s }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.title = settings.shopName;
  }, [settings.shopName]);

  const value = useMemo(
    () => ({ ...settings, fmt: (n) => money(n, settings.currencySymbol) }),
    [settings]
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
