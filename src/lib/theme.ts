// Colors, accents and fonts. Every screen builds its StyleSheet from these tokens.

export type ThemeName = 'dark' | 'light';
export type Lang = 'en' | 'ko';
export type AccentId = 'teal' | 'blue' | 'amber' | 'violet' | 'coral';

export type Accent = { id: AccentId; hex: string; ink: string; en: string; ko: string };

// `ink` is a darker shade of each accent, used for accent-colored text on light backgrounds.
export const ACCENTS: Accent[] = [
	{ id: 'teal', hex: '#00B6B0', ink: '#00807C', en: 'Teal', ko: '틸' },
	{ id: 'blue', hex: '#4C8DFF', ink: '#2F6FE0', en: 'Blue', ko: '블루' },
	{ id: 'amber', hex: '#F2A93B', ink: '#A0660A', en: 'Amber', ko: '앰버' },
	{ id: 'violet', hex: '#9B7BFF', ink: '#6B4BD8', en: 'Violet', ko: '바이올렛' },
	{ id: 'coral', hex: '#FF6B5E', ink: '#C93E30', en: 'Coral', ko: '코랄' },
];

const PALETTE = {
	dark: {
		bg: '#000000', surface: '#0D0E0F', border: '#1F2224', text: '#E9E9ED', muted: '#9A9DAB', faint: '#6E7080',
		chip: '#141414', chipText: '#A9ABB8', sheetBg: '#0A0B0B', tileBg: '#070909', overlay: 'rgba(0,0,0,0.66)',
		glass: 'rgba(8,10,10,0.6)', glassBorder: 'rgba(255,255,255,0.14)', knob: 'rgba(233,233,237,0.14)', knobBorder: 'rgba(233,233,237,0.4)',
		labelBg: 'rgba(0,0,0,0.72)', labelText: '#D6D8E0', labelBorder: 'rgba(255,255,255,0.16)', error: '#FF8A80',
		scene: 0x000000, line: 0xe9e9ed, lineOpacity: 0.32, dimLine: 0xbfc2cc, gridB: 0x1a1d1f, gridMix: 0.42, outlet: 0x2b2f31,
	},
	light: {
		bg: '#F4F5F7', surface: '#FFFFFF', border: '#DDE0E5', text: '#0E1011', muted: '#5B5F6B', faint: '#8A8E99',
		chip: '#E4E6EA', chipText: '#3D4049', sheetBg: '#FFFFFF', tileBg: '#ECEEF1', overlay: 'rgba(20,22,24,0.35)',
		glass: 'rgba(255,255,255,0.8)', glassBorder: 'rgba(0,0,0,0.1)', knob: 'rgba(14,16,17,0.08)', knobBorder: 'rgba(14,16,17,0.3)',
		labelBg: 'rgba(255,255,255,0.9)', labelText: '#2A2D33', labelBorder: 'rgba(0,0,0,0.12)', error: '#B3261E',
		scene: 0xf4f5f7, line: 0x1a1d20, lineOpacity: 0.42, dimLine: 0x5b5f6b, gridB: 0xd5d8de, gridMix: 0.55, outlet: 0xc9ccd2,
	},
} as const;

export const FONTS = {
	mono: 'JetBrainsMono_500Medium',
	hangul: 'NanumGothicCoding_400Regular',
	hangulBold: 'NanumGothicCoding_700Bold',
};

export type Tokens = ReturnType<typeof makeTokens>;

export function makeTokens(theme: ThemeName, accentId: AccentId, lang: Lang) {
	const p = PALETTE[theme];
	const a = ACCENTS.find((x) => x.id === accentId) ?? ACCENTS[0];
	const dark = theme === 'dark';
	return {
		...p,
		theme,
		isDark: dark,
		accent: a.hex,
		accentId: a.id,
		ink: dark ? a.hex : a.ink,
		accentSoft: a.hex + '29',
		accentGlow: a.hex + '8C',
		accentLine: a.hex + '55',
		accentNum: parseInt(a.hex.slice(1), 16),
		// Monospace labels: JetBrains Mono for Latin, Nanum Gothic Coding when the UI is Korean.
		mono: lang === 'ko' ? FONTS.hangul : FONTS.mono,
		monoLatin: FONTS.mono,
		body: lang === 'ko' ? FONTS.hangul : undefined,
		upper: lang === 'en',
		rowSpacing: lang === 'ko' ? 0.6 : 1.7,
		labelSpacing: lang === 'ko' ? 0.6 : 1.5,
	};
}
