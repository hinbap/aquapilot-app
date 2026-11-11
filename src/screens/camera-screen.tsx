import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraIcon, CheckIcon } from 'phosphor-react-native';
import BackButton from '../components/back-button';
import { useApp, useStyles } from '../lib/settings';
import type { Tokens } from '../lib/theme';
import OpencvBridge from '../../modules/opencv-bridge/src/OpencvBridgeModule';
import { choosePhoto, type Photo } from '../lib/photo-library';

export default function CameraScreen({ initialPhoto }: { initialPhoto?: Photo }) {
	const { s, t } = useApp();
	const styles = useStyles(createStyles);
	const camera = useRef<CameraView>(null);
	const busy = useRef(false);
	const focused = useRef(false);
	const fromGallery = !!initialPhoto;
	const [permission, requestPermission, getPermission] = useCameraPermissions({ get: !fromGallery });
	const [active, setActive] = useState(false);
	const [ready, setReady] = useState(false);
	const [capturing, setCapturing] = useState(false);
	const [sending, setSending] = useState(false);
	const [requesting, setRequesting] = useState(false);
	const [photo, setPhoto] = useState<Photo | null>(initialPhoto ?? null);
	const [picking, setPicking] = useState(false);
	const [received, setReceived] = useState(false);
	const [cameraFailed, setCameraFailed] = useState(false);
	const [error, setError] = useState<'captureError' | 'permissionError' | 'photoSendError' | 'photoNativeUnavailable' | 'photoWebUnsupported' | 'galleryError' | null>(null);

	useFocusEffect(useCallback(() => {
		focused.current = true;
		setActive(AppState.currentState === 'active');
		const refreshPermission = () => { if (!fromGallery) getPermission().catch(() => setError('permissionError')); };
		refreshPermission();
		const subscription = AppState.addEventListener('change', (state) => {
			setReady(false);
			setActive(state === 'active');
			if (state === 'active') refreshPermission();
		});
		return () => {
			focused.current = false;
			setActive(false);
			setReady(false);
			subscription.remove();
		};
	}, [getPermission, fromGallery]));

	async function allowCamera() {
		if (requesting) return;
		setRequesting(true);
		setError(null);
		try {
			if (permission && !permission.canAskAgain && Platform.OS !== 'web') {
				await Linking.openSettings();
			} else {
				await requestPermission();
			}
		} catch {
			setError('permissionError');
		} finally {
			setRequesting(false);
		}
	}

	async function takePhoto() {
		const currentCamera = camera.current;
		if (!currentCamera || !ready || busy.current) return;
		busy.current = true;
		setCapturing(true);
		setError(null);
		try {
			const picture = await currentCamera.takePictureAsync({ quality: 0.9 });
			if (!picture?.uri) throw new Error('No photo returned');
			if (focused.current && camera.current === currentCamera) {
				setPhoto(picture);
				setReady(false);
			}
		} catch {
			if (focused.current) setError('captureError');
		} finally {
			busy.current = false;
			setCapturing(false);
		}
	}

	async function usePhoto() {
		if (!photo || busy.current || received) return;
		setError(null);
		if (Platform.OS === 'web') { setError('photoWebUnsupported'); return; }
		if (!OpencvBridge?.receivePhoto) { setError('photoNativeUnavailable'); return; }
		busy.current = true;
		setSending(true);
		try {
			await OpencvBridge.receivePhoto(photo.uri, photo.width, photo.height);
			if (focused.current) setReceived(true);
		} catch {
			if (focused.current) setError('photoSendError');
		} finally {
			busy.current = false;
			setSending(false);
		}
	}

	async function retake() {
		if (busy.current) return;
		if (fromGallery) {
			busy.current = true;
			setPicking(true);
			setError(null);
			try {
				const selected = await choosePhoto();
				if (selected && focused.current) setPhoto(selected);
			} catch {
				if (focused.current) setError('galleryError');
			} finally {
				busy.current = false;
				setPicking(false);
			}
			return;
		}
		setReady(false);
		setError(null);
		setCameraFailed(false);
		setPhoto(null);
	}

	const blocked = permission && !permission.granted && !permission.canAskAgain;
	const shutterDisabled = !ready || capturing || !active;

	return (
		<SafeAreaView style={styles.root} edges={['top', 'bottom']}>
			<View style={styles.header}>
				<BackButton onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />
				<Text style={styles.title}>{received ? s.photoReceived : photo ? s.reviewPhoto : s.takePhoto}</Text>
			</View>

			<View style={styles.viewfinder}>
				{photo ? (
					<Image source={{ uri: photo.uri }} style={styles.preview} contentFit="contain" accessibilityLabel={s.reviewPhoto} />
				) : !permission ? (
					<View style={styles.message}><ActivityIndicator color={t.ink} />
						{error && <Action label={s.tryAgain} onPress={allowCamera} disabled={requesting} />}
					</View>
				) : !permission.granted ? (
					<View style={styles.message}>
						<CameraIcon size={32} color={t.ink} />
						<Text style={styles.messageTitle}>{s.cameraPermissionTitle}</Text>
						<Text style={styles.messageText}>{blocked ? Platform.OS === 'web' ? s.cameraPermissionWeb : s.cameraPermissionBlocked : s.cameraPermissionMessage}</Text>
						<Action label={blocked && Platform.OS !== 'web' ? s.openSettings : s.allowCamera} onPress={allowCamera} disabled={requesting} />
					</View>
				) : cameraFailed ? (
					<View style={styles.message}>
						<Text style={styles.messageText}>{s.cameraError}</Text>
						<Action label={s.tryAgain} onPress={() => { setReady(false); setCameraFailed(false); }} />
					</View>
				) : active ? (
					<>
						<CameraView ref={camera} style={styles.preview} facing="back" mode="picture"
							onCameraReady={() => setReady(true)}
							onMountError={() => { setReady(false); setCameraFailed(true); }} />
						{!ready && <View style={styles.loading}><ActivityIndicator color="#FFFFFF" /></View>}
					</>
				) : null}
			</View>

			<View style={styles.controls}>
				{error && <Text accessibilityRole="alert" style={styles.error}>{s[error]}</Text>}
				<Text style={styles.hint}>{received ? s.photoReceivedMessage : photo ? s.reviewPhotoHint : s.photoHint}</Text>
				{received ? (
					<View style={styles.confirmed}>
						<CheckIcon size={24} color={t.ink} />
						<Action label={s.done} onPress={() => router.dismissTo('/')} primary />
					</View>
				) : photo ? (
					<View style={styles.reviewActions}>
						<Action label={fromGallery ? s.chooseAnotherPhoto : s.retakePhoto} onPress={retake} disabled={sending || picking} />
						<Action label={sending ? s.photoSending : s.usePhoto} onPress={usePhoto} disabled={sending || picking} primary />
					</View>
				) : permission?.granted && !cameraFailed ? (
					<Pressable onPress={takePhoto} disabled={shutterDisabled} accessibilityRole="button" accessibilityLabel={s.takePhoto}
						accessibilityState={{ disabled: shutterDisabled, busy: capturing }}
						style={({ pressed }) => [styles.shutter, shutterDisabled && styles.disabled, pressed && styles.pressed]}>
						{capturing ? <ActivityIndicator color={t.ink} /> : <View style={styles.shutterInner} />}
					</Pressable>
				) : null}
			</View>
		</SafeAreaView>
	);
}

function Action({ label, onPress, disabled = false, primary = false }: { label: string; onPress: () => void; disabled?: boolean; primary?: boolean }) {
	const styles = useStyles(createStyles);
	return (
		<Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }}
			style={({ pressed }) => [styles.action, primary && styles.primary, disabled && styles.disabled, pressed && styles.pressed]}>
			<Text style={[styles.actionText, primary && styles.primaryText]}>{label}</Text>
		</Pressable>
	);
}

const createStyles = (t: Tokens) => StyleSheet.create({
	root: { flex: 1, backgroundColor: t.bg },
	header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 20, gap: 12 },
	title: { fontFamily: t.body, fontSize: 28, fontWeight: '500', color: t.text },
	viewfinder: { flex: 1, marginHorizontal: 20, borderRadius: 16, overflow: 'hidden', backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
	preview: { ...StyleSheet.absoluteFill, backgroundColor: '#000000' },
	loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
	message: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 },
	messageTitle: { fontFamily: t.body, fontSize: 20, color: t.text, textAlign: 'center' },
	messageText: { fontFamily: t.mono, fontSize: 13, lineHeight: 21, color: t.muted, textAlign: 'center' },
	controls: { alignItems: 'center', gap: 20, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
	hint: { fontFamily: t.mono, fontSize: 12, lineHeight: 18, color: t.muted, textAlign: 'center' },
	error: { fontFamily: t.mono, fontSize: 12, lineHeight: 18, color: t.error, textAlign: 'center' },
	reviewActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, width: '100%' },
	confirmed: { flexDirection: 'row', alignItems: 'center', gap: 16 },
	action: { minHeight: 48, minWidth: 120, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface },
	actionText: { fontFamily: t.mono, fontSize: 13, color: t.text, textAlign: 'center' },
	primary: { backgroundColor: t.ink, borderColor: t.ink },
	primaryText: { color: t.bg },
	shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 2, borderColor: t.ink, padding: 6, alignItems: 'center', justifyContent: 'center' },
	shutterInner: { width: '100%', height: '100%', borderRadius: 32, backgroundColor: t.ink },
	disabled: { opacity: 0.45 },
	pressed: { opacity: 0.65 },
});
