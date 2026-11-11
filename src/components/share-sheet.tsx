// Bottom sheet: share to AquaPilot (pick a folder in an expandable tree) or to other apps.
import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Image, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View, useAnimatedValue } from 'react-native';
import { ArrowLeftIcon, ArrowRightIcon, ArrowUpRightIcon, CaretRightIcon, CheckIcon, DownloadSimpleIcon, FolderSimpleIcon, ShareNetworkIcon, XIcon } from 'phosphor-react-native';
import { FOLDERS, type Folder } from '../lib/data';
import { useApp, useStyles } from '../lib/settings';
import type { Tokens } from '../lib/theme';

const LOGO = require('../../assets/images/a-white.png');

type Step = 'options' | 'folders' | 'done';
type Row = { f: Folder; depth: number; expanded: boolean };

export default function ShareSheet({ visible, projectName, onClose }: { visible: boolean; projectName: string; onClose: () => void }) {
	const { t, s, settings } = useApp();
	const styles = useStyles(createStyles);
	const lang = settings.lang;
	const [mounted, setMounted] = useState(visible);
	const [step, setStep] = useState<Step>('options');
	const [expanded, setExpanded] = useState<Record<string, boolean>>({});
	const [selected, setSelected] = useState<string | null>(null);
	const [savedTo, setSavedTo] = useState('');
	const anim = useAnimatedValue(0);

	// Reset the sheet each time it opens (React's "adjust state when a prop changes" pattern).
	const [prevVisible, setPrevVisible] = useState(visible);
	if (visible !== prevVisible) {
		setPrevVisible(visible);
		if (visible) {
			setMounted(true);
			setStep('options');
			setSelected(null);
			setExpanded({});
		}
	}

	useEffect(() => {
		if (visible) {
			Animated.timing(anim, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
		} else {
			Animated.timing(anim, { toValue: 0, duration: 240, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setMounted(false));
		}
	}, [visible, anim]);

	const { rows, trail } = useMemo(() => {
		const out: Row[] = [];
		let found: string[] | null = null;
		const walk = (list: Folder[], depth: number, path: string[], show: boolean) =>
			list.forEach((f) => {
				const p = [...path, f[lang]];
				if (f.id === selected) found = p;
				const isOpen = !!expanded[f.id];
				if (show) out.push({ f, depth, expanded: isOpen });
				if (f.children) walk(f.children, depth + 1, p, show && isOpen);
			});
		walk(FOLDERS, 0, [], true);
		return { rows: out, trail: found as string[] | null };
	}, [expanded, selected, lang]);

	const shareToOtherApps = async () => {
		onClose();
		try {
			await Share.share({ message: projectName, title: projectName });
		} catch {
			// user dismissed the system sheet
		}
	};

	const save = () => {
		if (!trail) return;
		setSavedTo(['AquaPilot', ...trail].join(' / '));
		setStep('done');
	};

	const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });
	const upper = (x: string) => (t.upper ? x.toUpperCase() : x);

	const CloseButton = (
		<Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={s.close} style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}>
			<XIcon size={16} color={t.muted} />
		</Pressable>
	);

	return (
		<Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
			<Animated.View style={[styles.overlay, { opacity: anim }]}>
				<Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={s.close} />
			</Animated.View>
			<Animated.View style={[styles.sheet, { transform: [{ translateY }] }]} accessibilityViewIsModal>
				<View style={styles.grabber} />

				{step === 'options' && (
					<>
						<View style={styles.header}>
							<View style={styles.headerText}>
								<Text style={styles.eyebrow}>{upper(s.share)}</Text>
								<Text style={styles.title}>{projectName}</Text>
							</View>
							{CloseButton}
						</View>
						<Pressable onPress={() => setStep('folders')} accessibilityRole="button" style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
							<Text style={styles.optionIndex}>01</Text>
							<View style={styles.appTile}>
								<Image source={LOGO} style={styles.appTileGlyph} resizeMode="contain" />
								<View style={styles.appTileDot} />
							</View>
							<View style={styles.optionText}>
								<Text style={styles.optionTitle}>AQUAPILOT</Text>
								<Text style={styles.optionSub}>{s.aquaSub}</Text>
							</View>
							<ArrowRightIcon size={16} color={t.faint} />
						</Pressable>
						<Pressable onPress={shareToOtherApps} accessibilityRole="button" style={({ pressed }) => [styles.option, styles.optionLast, pressed && styles.pressed]}>
							<Text style={styles.optionIndex}>02</Text>
							<View style={styles.iconTile}>
								<ShareNetworkIcon size={20} color={t.muted} />
							</View>
							<View style={styles.optionText}>
								<Text style={styles.optionTitle}>{upper(s.otherApps)}</Text>
								<Text style={styles.optionSub}>{s.otherSub}</Text>
							</View>
							<ArrowUpRightIcon size={16} color={t.faint} />
						</Pressable>
					</>
				)}

				{step === 'folders' && (
					<>
						<View style={styles.folderHeader}>
							<Pressable onPress={() => setStep('options')} accessibilityRole="button" style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
								<ArrowLeftIcon size={14} color={t.muted} />
								<Text style={styles.backLabel}>{upper(s.back)}</Text>
							</Pressable>
							{CloseButton}
						</View>
						<Text style={styles.folderTitle}>{s.chooseFolder}</Text>
						<ScrollView style={styles.tree} contentContainerStyle={styles.treeContent}>
							{rows.map(({ f, depth, expanded: isOpen }) => {
								const sel = selected === f.id;
								return (
									<View key={f.id} style={[styles.row, sel && styles.rowSelected, { paddingLeft: depth * 18 }]}>
										{f.children ? (
											<Pressable
												onPress={() => setExpanded((e) => ({ ...e, [f.id]: !isOpen }))}
												accessibilityRole="button"
												accessibilityState={{ expanded: isOpen }}
												accessibilityLabel={`${isOpen ? s.collapse : s.expand} ${f[lang]}`}
												hitSlop={6}
												style={styles.caret}
											>
												<View style={isOpen ? styles.caretOpen : undefined}>
													<CaretRightIcon size={11} weight="bold" color={isOpen ? t.ink : t.muted} />
												</View>
											</Pressable>
										) : (
											<View style={styles.caret} />
										)}
										<Pressable onPress={() => setSelected(f.id)} accessibilityRole="radio" accessibilityState={{ selected: sel }} style={styles.rowMain}>
											<FolderSimpleIcon size={15} color={sel ? t.ink : t.muted} />
											<Text style={styles.rowName} numberOfLines={1}>{f[lang]}</Text>
											<View style={[styles.radio, sel && styles.radioOn]}>{sel && <View style={styles.radioDot} />}</View>
										</Pressable>
									</View>
								);
							})}
						</ScrollView>
						<Pressable
							onPress={save}
							disabled={!trail}
							accessibilityRole="button"
							accessibilityState={{ disabled: !trail }}
							style={({ pressed }) => [styles.saveBtn, !trail && styles.disabled, pressed && styles.pressed]}
						>
							<DownloadSimpleIcon size={18} color={t.ink} />
							<Text style={styles.saveLabel}>{upper(s.saveHere)}</Text>
						</Pressable>
					</>
				)}

				{step === 'done' && (
					<>
						<View style={styles.doneTop}>{CloseButton}</View>
						<View style={styles.doneBody}>
							<View style={styles.doneBadge}>
								<CheckIcon size={26} color={t.ink} weight="bold" />
							</View>
							<Text style={styles.doneTitle}>{s.saved}</Text>
							<Text style={styles.doneProject}>{projectName}</Text>
							<Text style={styles.donePath}>{savedTo}</Text>
						</View>
						<Pressable onPress={onClose} accessibilityRole="button" style={({ pressed }) => [styles.doneBtn, pressed && styles.pressed]}>
							<Text style={styles.doneBtnLabel}>{upper(s.done)}</Text>
						</Pressable>
					</>
				)}
			</Animated.View>
		</Modal>
	);
}

const createStyles = (t: Tokens) =>
	StyleSheet.create({
		overlay: { ...StyleSheet.absoluteFill, backgroundColor: t.overlay },
		sheet: {
			position: 'absolute', left: 0, right: 0, bottom: 0,
			backgroundColor: t.sheetBg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
			borderTopWidth: 1, borderColor: t.accentLine,
			paddingTop: 10, paddingHorizontal: 20, paddingBottom: 46,
			shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 30, shadowOffset: { width: 0, height: -12 },
		},
		grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: t.border, marginBottom: 6 },
		pressed: { opacity: 0.6 },
		disabled: { opacity: 0.4 },
		header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 10, marginBottom: 16, marginLeft: 4 },
		headerText: { flex: 1, gap: 6 },
		eyebrow: { fontFamily: t.mono, fontSize: 11, letterSpacing: t.labelSpacing, color: t.ink },
		title: { fontFamily: t.body, fontSize: 20, fontWeight: '500', color: t.text },
		closeBtn: {
			width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface,
			alignItems: 'center', justifyContent: 'center',
		},
		option: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, paddingHorizontal: 4, borderTopWidth: 1, borderColor: t.border },
		optionLast: { borderBottomWidth: 1 },
		optionIndex: { fontFamily: t.monoLatin, fontSize: 12, color: t.ink, opacity: 0.8 },
		appTile: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#000', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
		appTileGlyph: { position: 'absolute', left: '22%', top: '28.65%', width: '41.5%', height: '42.7%' },
		appTileDot: { position: 'absolute', left: '65.5%', top: '58.85%', width: '12.5%', height: '12.5%', borderRadius: 3, backgroundColor: t.accent },
		iconTile: {
			width: 44, height: 44, borderRadius: 12, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border,
			alignItems: 'center', justifyContent: 'center',
		},
		optionText: { flex: 1, gap: 4 },
		optionTitle: { fontFamily: t.mono, fontSize: 14, letterSpacing: t.labelSpacing, color: t.text },
		optionSub: { fontFamily: t.body, fontSize: 12, color: t.muted },
		folderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 8 },
		backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 4 },
		backLabel: { fontFamily: t.mono, fontSize: 12, letterSpacing: t.labelSpacing, color: t.muted },
		folderTitle: { fontFamily: t.body, fontSize: 20, fontWeight: '500', color: t.text, marginLeft: 4, marginBottom: 10 },
		tree: { maxHeight: 290, borderTopWidth: 1, borderColor: t.border },
		treeContent: { paddingTop: 8, gap: 2 },
		row: { flexDirection: 'row', alignItems: 'center', borderRadius: 8 },
		rowSelected: { backgroundColor: t.accentSoft },
		caret: { width: 26, height: 34, alignItems: 'center', justifyContent: 'center' },
		caretOpen: { transform: [{ rotate: '90deg' }] },
		rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingRight: 10, paddingLeft: 2 },
		rowName: { flex: 1, fontFamily: t.mono, fontSize: 12, letterSpacing: 0.3, color: t.text },
		radio: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: t.faint, alignItems: 'center', justifyContent: 'center' },
		radioOn: { borderColor: t.accent },
		radioDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.accent },
		saveBtn: {
			marginTop: 16, height: 52, borderRadius: 14, borderWidth: 1, borderColor: t.accent, backgroundColor: t.accentSoft,
			flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
		},
		saveLabel: { fontFamily: t.mono, fontSize: 13, letterSpacing: t.labelSpacing, color: t.text },
		doneTop: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
		doneBody: { alignItems: 'center', gap: 14, paddingHorizontal: 8, paddingBottom: 8 },
		doneBadge: {
			width: 60, height: 60, borderRadius: 30, borderWidth: 1.5, borderColor: t.accent, alignItems: 'center', justifyContent: 'center',
			shadowColor: t.accent, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
		},
		doneTitle: { fontFamily: t.body, fontSize: 20, fontWeight: '500', color: t.text },
		doneProject: { fontFamily: t.body, fontSize: 14, color: t.muted },
		donePath: {
			fontFamily: t.mono, fontSize: 12, color: t.ink, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6,
			backgroundColor: t.surface, overflow: 'hidden', textAlign: 'center',
		},
		doneBtn: { marginTop: 18, height: 52, borderRadius: 14, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' },
		doneBtnLabel: { fontFamily: t.mono, fontSize: 13, letterSpacing: t.labelSpacing, color: t.text },
	});
