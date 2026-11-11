import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowRightIcon, CaretDownIcon, CheckIcon } from 'phosphor-react-native';
import BackButton from '../components/back-button';
import { LANGUAGES } from '../lib/i18n';
import { useApp, useStyles } from '../lib/settings';
import { ACCENTS, type Tokens } from '../lib/theme';

export default function SettingsScreen() {
	const { t, s, settings, update } = useApp();
	const styles = useStyles(createStyles);
	const [langOpen, setLangOpen] = useState(false);
	const label = (x: string) => (t.upper ? x.toUpperCase() : x);
	const current = LANGUAGES.find((l) => l.id === settings.lang) ?? LANGUAGES[0];

	return (
		<SafeAreaView style={styles.root} edges={['top', 'bottom']}>
			{langOpen && <Pressable style={styles.scrim} onPress={() => setLangOpen(false)} accessibilityLabel={s.close} />}

			<BackButton onPress={() => router.back()} />
			<Text style={styles.title}>{s.settings}</Text>

			<View style={styles.list}>
				{/* 01 Language */}
				<View style={[styles.row, styles.rowRaised]}>
					<Text style={styles.label}>
						<Text style={styles.index}>01  </Text>
						{label(s.language)}
					</Text>
					<View>
						<Pressable
							onPress={() => setLangOpen((o) => !o)}
							accessibilityRole="button"
							accessibilityLabel={`${s.language}: ${current.label}`}
							accessibilityState={{ expanded: langOpen }}
							style={({ pressed }) => [styles.dropdownBtn, pressed && styles.pressed]}
						>
							<Text style={styles.value}>{current.label}</Text>
							<View style={langOpen ? styles.caretUp : undefined}>
								<CaretDownIcon size={12} weight="bold" color={t.muted} />
							</View>
						</Pressable>
						{langOpen && (
							<View style={styles.menu}>
								{LANGUAGES.map((l) => {
									const sel = l.id === settings.lang;
									return (
										<Pressable
											key={l.id}
											onPress={() => { update({ lang: l.id }); setLangOpen(false); }}
											accessibilityRole="menuitem"
											accessibilityState={{ selected: sel }}
											style={({ pressed }) => [styles.menuItem, sel && styles.menuItemSelected, pressed && styles.pressed]}
										>
											<Text style={styles.menuLabel}>{l.label}</Text>
											{sel && <CheckIcon size={14} weight="bold" color={t.ink} />}
										</Pressable>
									);
								})}
							</View>
						)}
					</View>
				</View>

				{/* 02 Appearance */}
				<View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={s.appearance}>
					<Text style={styles.label}>
						<Text style={styles.index}>02  </Text>
						{label(s.appearance)}
					</Text>
					<View style={styles.segment}>
						{(['dark', 'light'] as const).map((mode) => {
							const on = settings.theme === mode;
							return (
								<Pressable
									key={mode}
									onPress={() => update({ theme: mode })}
									accessibilityRole="radio"
									accessibilityState={{ selected: on }}
									style={[styles.segmentBtn, on && styles.segmentBtnOn]}
								>
									<Text style={[styles.segmentLabel, on && styles.segmentLabelOn]}>{mode === 'dark' ? s.dark : s.light}</Text>
								</Pressable>
							);
						})}
					</View>
				</View>

				{/* 03 Accent color */}
				<View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={s.accent}>
					<Text style={styles.label}>
						<Text style={styles.index}>03  </Text>
						{label(s.accent)}
					</Text>
					<View style={styles.swatches}>
						{ACCENTS.map((a) => {
							const on = settings.accent === a.id;
							return (
								<Pressable
									key={a.id}
									onPress={() => update({ accent: a.id })}
									accessibilityRole="radio"
									accessibilityLabel={`${a[settings.lang]} ${a.hex}`}
									accessibilityState={{ selected: on }}
									hitSlop={4}
									style={styles.swatchHit}
								>
									{/* per-swatch color comes from the data, so it is the one inline value */}
									<View style={[styles.swatchRing, on && { borderColor: a.hex }]}>
										<View style={[styles.swatch, { backgroundColor: a.hex }]} />
									</View>
								</Pressable>
							);
						})}
					</View>
				</View>

				{/* 04 Account */}
				<View style={styles.row}>
					<Text style={styles.label}>
						<Text style={styles.index}>04  </Text>
						{label(s.account)}
					</Text>
					{settings.loggedIn ? (
						<View style={styles.account}>
							<Text style={styles.email} numberOfLines={1}>{settings.email}</Text>
							<Pressable onPress={() => update({ loggedIn: false, email: '' })} accessibilityRole="button" hitSlop={8} style={({ pressed }) => pressed && styles.pressed}>
								<Text style={styles.value}>{s.logout}</Text>
							</Pressable>
						</View>
					) : (
						<Pressable onPress={() => router.push('/login')} accessibilityRole="button" hitSlop={8} style={({ pressed }) => [styles.loginLink, pressed && styles.pressed]}>
							<Text style={styles.loginText}>{s.login}</Text>
							<ArrowRightIcon size={14} weight="bold" color={t.ink} />
						</Pressable>
					)}
				</View>
			</View>

			<View style={styles.spacer} />
			<Text style={styles.version}>aquapilot v1.0.0</Text>
		</SafeAreaView>
	);
}

const createStyles = (t: Tokens) =>
	StyleSheet.create({
		root: { flex: 1, backgroundColor: t.bg, paddingTop: 20, paddingHorizontal: 24, paddingBottom: 20 },
		scrim: { ...StyleSheet.absoluteFill, zIndex: 5 },
		title: { fontFamily: t.body, fontSize: 28, fontWeight: '500', letterSpacing: -0.3, color: t.text, marginTop: 20, marginBottom: 20 },
		list: { borderTopWidth: 1, borderColor: t.border },
		row: {
			flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16,
			minHeight: 60, borderBottomWidth: 1, borderColor: t.border,
		},
		rowRaised: { zIndex: 10 },
		label: { fontFamily: t.mono, fontSize: 11, letterSpacing: t.labelSpacing, color: t.muted },
		index: { fontFamily: t.monoLatin, color: t.ink },
		value: { fontFamily: t.body, fontSize: 15, color: t.text },
		pressed: { opacity: 0.6 },
		dropdownBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingLeft: 8 },
		caretUp: { transform: [{ rotate: '180deg' }] },
		menu: {
			position: 'absolute', top: '100%', right: -6, marginTop: 4, minWidth: 176, padding: 4, gap: 2,
			borderRadius: 12, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border,
			shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 17, shadowOffset: { width: 0, height: 14 }, elevation: 8,
		},
		menuItem: { height: 40, paddingHorizontal: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
		menuItemSelected: { backgroundColor: t.accentSoft },
		menuLabel: { fontFamily: t.body, fontSize: 15, color: t.text },
		segment: { flexDirection: 'row', gap: 2, padding: 3, borderRadius: 999, borderWidth: 1, borderColor: t.border },
		segmentBtn: { height: 32, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
		segmentBtnOn: { backgroundColor: t.text },
		segmentLabel: { fontFamily: t.body, fontSize: 14, color: t.muted },
		segmentLabelOn: { color: t.bg },
		swatches: { flexDirection: 'row', alignItems: 'center', gap: 4 },
		swatchHit: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
		swatchRing: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
		swatch: { width: 18, height: 18, borderRadius: 9 },
		account: { flexDirection: 'row', alignItems: 'center', gap: 14, flexShrink: 1 },
		email: { fontFamily: t.body, fontSize: 13, color: t.muted, flexShrink: 1, maxWidth: 170 },
		loginLink: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
		loginText: { fontFamily: t.body, fontSize: 15, fontWeight: '500', color: t.ink },
		spacer: { flex: 1 },
		version: { textAlign: 'center', fontFamily: t.monoLatin, fontSize: 11, letterSpacing: 0.6, color: t.muted },
	});
