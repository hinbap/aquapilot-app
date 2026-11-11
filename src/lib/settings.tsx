// App-wide settings (language, theme, accent, account). Saved on the device and shared by every screen.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeTokens, type AccentId, type Lang, type ThemeName, type Tokens } from './theme';
import { STRINGS, type Strings } from './i18n';

export type Settings = {
	lang: Lang;
	theme: ThemeName;
	accent: AccentId;
	loggedIn: boolean;
	email: string;
};

const DEFAULTS: Settings = { lang: 'en', theme: 'dark', accent: 'teal', loggedIn: false, email: '' };
const STORAGE_KEY = 'aquapilot.settings.v1';

type Ctx = {
	settings: Settings;
	update: (patch: Partial<Settings>) => void;
	t: Tokens;
	s: Strings;
	ready: boolean;
};

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
	const [settings, setSettings] = useState<Settings>(DEFAULTS);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		AsyncStorage.getItem(STORAGE_KEY)
			.then((raw) => {
				if (raw) setSettings({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) });
			})
			.catch(() => { })
			.finally(() => setReady(true));
	}, []);

	const update = useCallback((patch: Partial<Settings>) => {
		setSettings((prev) => {
			const next = { ...prev, ...patch };
			AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => { });
			return next;
		});
	}, []);

	const value = useMemo<Ctx>(
		() => ({
			settings,
			update,
			t: makeTokens(settings.theme, settings.accent, settings.lang),
			s: STRINGS[settings.lang],
			ready,
		}),
		[settings, update, ready],
	);

	return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useApp(): Ctx {
	const ctx = useContext(SettingsContext);
	if (!ctx) throw new Error('useApp must be used inside <SettingsProvider>');
	return ctx;
}

/**
 * Builds a component's StyleSheet from the current theme tokens.
 * Each file declares `const createStyles = (t: Tokens) => StyleSheet.create({...})`
 * and calls `const styles = useStyles(createStyles)`.
 */
export function useStyles<T>(factory: (t: Tokens) => T): T {
	const { t } = useApp();
	return useMemo(() => factory(t), [factory, t]);
}
