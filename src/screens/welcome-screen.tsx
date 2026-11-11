import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { getPendingResultAsync } from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRightIcon } from 'phosphor-react-native';
import LogoMark from '../components/logo-mark';
import DotMarquee from '../components/dot-marquee';
import { useApp, useStyles } from '../lib/settings';
import type { Tokens } from '../lib/theme';
import { useRouter } from 'expo-router';
import { choosePhoto, type Photo } from '../lib/photo-library';

type Props = {
	onTakePhoto?: () => void;
	onChooseFromGallery?: () => void;
	onPrivacyPolicy?: () => void;
	onTerms?: () => void;
};

export default function WelcomeScreen({ onTakePhoto, onChooseFromGallery, onPrivacyPolicy, onTerms }: Props) {
	const { s } = useApp();
	const styles = useStyles(createStyles);
	const router = useRouter();
	const picking = useRef(false);
	const [galleryBusy, setGalleryBusy] = useState(false);
	const [galleryError, setGalleryError] = useState(false);
	const reviewPhoto = useCallback((photo: Photo) => {
		router.push({ pathname: '/camera', params: { photoUri: photo.uri, photoWidth: photo.width, photoHeight: photo.height } });
	}, [router]);

	useEffect(() => {
		if (Platform.OS !== 'android') return;
		let mounted = true;
		// Recover a selection if Android recreated the activity while the picker was open.
		getPendingResultAsync().then((result) => {
			if (!mounted || !result) return;
			if ('code' in result) { setGalleryError(true); return; }
			if (!result.canceled && result.assets[0]) reviewPhoto(result.assets[0]);
		}).catch(() => { if (mounted) setGalleryError(true); });
		return () => { mounted = false; };
	}, [reviewPhoto]);

	const openGallery = useCallback(async () => {
		if (picking.current) return;
		picking.current = true;
		setGalleryBusy(true);
		setGalleryError(false);
		try {
			const photo = await choosePhoto();
			if (photo) reviewPhoto(photo);
		} catch {
			setGalleryError(true);
		} finally {
			picking.current = false;
			setGalleryBusy(false);
		}
	}, [reviewPhoto]);

	return (
		<SafeAreaView style={styles.root} edges={['top', 'bottom']}>
			<View style={styles.hero}>
				<LogoMark />
				<DotMarquee />
			</View>

			<View style={styles.spacer} />

			<View style={styles.actions}>
				<ActionRow index="01" label={s.takePhoto} onPress={onTakePhoto ?? (() => router.navigate('/camera'))} disabled={galleryBusy} />
				<ActionRow index="02" label={s.gallery} onPress={onChooseFromGallery ?? openGallery} disabled={galleryBusy} />
				<ActionRow index="03" label={s.previous} onPress={() => router.navigate('/projects')} disabled={galleryBusy} />
				<ActionRow index="04" label={s.settings} onPress={() => router.navigate('/settings')} disabled={galleryBusy} />
				{galleryError && <Text accessibilityRole="alert" style={styles.error}>{s.galleryError}</Text>}
			</View>

			<View style={styles.legal}>
				<Text style={styles.legalText}>{s.legal1}</Text>
				<View style={styles.legalLinks}>
					<Pressable onPress={onPrivacyPolicy} accessibilityRole="link" style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
						<Text style={styles.chipText}>{s.privacy}</Text>
					</Pressable>
					<Text style={styles.legalText}>{s.and}</Text>
					<Pressable onPress={onTerms} accessibilityRole="link" style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
						<Text style={styles.chipText}>{s.terms}</Text>
					</Pressable>
					{!!s.legal3 && <Text style={styles.legalText}>{s.legal3}</Text>}
				</View>
			</View>
		</SafeAreaView>
	);
}

function ActionRow({ index, label, onPress, disabled }: { index: string; label: string; onPress?: () => void; disabled?: boolean }) {
	const { t } = useApp();
	const styles = useStyles(createStyles);
	return (
		<Pressable onPress={onPress} disabled={disabled} style={styles.row} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}>
			{({ pressed }) => (
				<>
					<Text style={styles.rowIndex}>{index}</Text>
					<Text style={[styles.rowLabel, pressed && styles.rowLabelPressed]}>{t.upper ? label.toUpperCase() : label}</Text>
					<ArrowRightIcon size={16} color={pressed ? t.ink : t.faint} />
				</>
			)}
		</Pressable>
	);
}

const createStyles = (t: Tokens) =>
	StyleSheet.create({
		root: { flex: 1, backgroundColor: t.bg },
		hero: { alignItems: 'center', gap: 44, marginTop: 90 },
		spacer: { flex: 1 },
		actions: { paddingHorizontal: 32 },
		error: { fontFamily: t.mono, fontSize: 12, lineHeight: 18, color: t.error, paddingHorizontal: 4 },
		row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, paddingHorizontal: 4 },
		rowIndex: { fontFamily: t.monoLatin, fontSize: 12, letterSpacing: 0.5, color: t.ink, opacity: 0.8 },
		rowLabel: { flex: 1, fontFamily: t.mono, fontSize: 14, letterSpacing: t.rowSpacing, color: t.text },
		rowLabelPressed: { color: t.ink },
		legal: { alignItems: 'center', gap: 8, marginTop: 28, marginBottom: 12, paddingHorizontal: 24 },
		legalLinks: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
		legalText: { fontFamily: t.mono, fontSize: 11, color: t.muted, textAlign: 'center' },
		chip: { paddingVertical: 4, paddingHorizontal: 7, borderRadius: 5, backgroundColor: t.chip },
		chipText: { fontFamily: t.mono, fontSize: 11, color: t.chipText },
		pressed: { opacity: 0.6 },
	});
