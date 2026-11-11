import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowRightIcon, EyeIcon, EyeSlashIcon } from 'phosphor-react-native';
import BackButton from '../components/back-button';
import LogoMark from '../components/logo-mark';
import { useApp, useStyles } from '../lib/settings';
import type { Tokens } from '../lib/theme';

type Field = 'org' | 'email' | 'pw';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = {
	/** Replace with your real auth call. Resolve to log in, throw to show an error. */
	onSubmit?: (v: { orgKey: string; email: string; password: string }) => Promise<void>;
	onGoogle?: () => Promise<string | void>; // may resolve with the account email
	onForgotPassword?: () => void;
};

export default function LoginScreen({ onSubmit, onGoogle, onForgotPassword }: Props) {
	const { t, s, update } = useApp();
	const styles = useStyles(createStyles);
	const [org, setOrg] = useState('');
	const [email, setEmail] = useState('');
	const [pw, setPw] = useState('');
	const [showPw, setShowPw] = useState(false);
	const [focus, setFocus] = useState<Field | null>(null);
	const [tried, setTried] = useState(false);
	const [error, setError] = useState('');
	const [busy, setBusy] = useState(false);

	const label = (x: string) => (t.upper ? x.toUpperCase() : x);
	const emailOk = EMAIL_RE.test(email.trim());
	const invalid = {
		org: tried && !org.trim(),
		email: tried && (!email.trim() || !emailOk),
		pw: tried && !pw,
	};
	const inputStyle = (f: Field) => [styles.input, focus === f && styles.inputFocused, invalid[f] && styles.inputError];

	const finish = (address: string) => {
		update({ loggedIn: true, email: address });
		router.back();
	};

	const submit = async () => {
		if (!org.trim() || !email.trim() || !pw) { setTried(true); setError(s.loginErr); return; }
		if (!emailOk) { setTried(true); setError(s.emailErr); return; }
		try {
			setBusy(true);
			await onSubmit?.({ orgKey: org.trim(), email: email.trim(), password: pw });
			finish(email.trim());
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	};

	const google = async () => {
		try {
			setBusy(true);
			const address = (await onGoogle?.()) || 'ash@example.com';
			finish(address);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	};

	const clearError = () => error && setError('');

	return (
		<SafeAreaView style={styles.root} edges={['top', 'bottom']}>
			<KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
				<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
					<BackButton onPress={() => router.back()} />

					<View style={styles.logo}>
						<LogoMark size={84} />
					</View>

					<View style={styles.form}>
						<View style={styles.field}>
							<Text style={styles.label} nativeID="orgLabel">{label(s.orgKey)}</Text>
							<TextInput
								accessibilityLabelledBy="orgLabel"
								accessibilityLabel={s.orgKey}
								value={org}
								onChangeText={(v) => { setOrg(v); clearError(); }}
								placeholder="AQP-7F3K-92XD"
								placeholderTextColor={t.faint}
								autoCapitalize="characters"
								autoCorrect={false}
								autoComplete="off"
								returnKeyType="next"
								onFocus={() => setFocus('org')}
								onBlur={() => setFocus(null)}
								style={[...inputStyle('org'), styles.inputMono]}
							/>
						</View>

						<View style={styles.field}>
							<Text style={styles.label} nativeID="emailLabel">{label(s.email)}</Text>
							<TextInput
								accessibilityLabelledBy="emailLabel"
								accessibilityLabel={s.email}
								value={email}
								onChangeText={(v) => { setEmail(v); clearError(); }}
								placeholder="name@company.com"
								placeholderTextColor={t.faint}
								keyboardType="email-address"
								autoCapitalize="none"
								autoCorrect={false}
								autoComplete="email"
								textContentType="emailAddress"
								returnKeyType="next"
								onFocus={() => setFocus('email')}
								onBlur={() => setFocus(null)}
								style={inputStyle('email')}
							/>
						</View>

						<View style={styles.field}>
							<View style={styles.pwHeader}>
								<Text style={styles.label} nativeID="pwLabel">{label(s.password)}</Text>
								<Pressable onPress={onForgotPassword} accessibilityRole="link" hitSlop={8}>
									<Text style={styles.link}>{s.forgot}</Text>
								</Pressable>
							</View>
							<View>
								<TextInput
									accessibilityLabelledBy="pwLabel"
									accessibilityLabel={s.password}
									value={pw}
									onChangeText={(v) => { setPw(v); clearError(); }}
									placeholder="••••••••"
									placeholderTextColor={t.faint}
									secureTextEntry={!showPw}
									autoCapitalize="none"
									autoCorrect={false}
									autoComplete="current-password"
									textContentType="password"
									returnKeyType="go"
									onSubmitEditing={submit}
									onFocus={() => setFocus('pw')}
									onBlur={() => setFocus(null)}
									style={[...inputStyle('pw'), styles.inputWithIcon]}
								/>
								<Pressable
									onPress={() => setShowPw((v) => !v)}
									accessibilityRole="button"
									accessibilityLabel={showPw ? s.hidePw : s.showPw}
									style={({ pressed }) => [styles.eye, pressed && styles.pressed]}
								>
									{showPw ? <EyeSlashIcon size={18} color={t.muted} /> : <EyeIcon size={18} color={t.muted} />}
								</Pressable>
							</View>
						</View>

						<Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>

						<Pressable onPress={submit} disabled={busy} accessibilityRole="button" style={({ pressed }) => [styles.primary, (pressed || busy) && styles.primaryPressed]}>
							<Text style={styles.primaryLabel}>{label(s.login)}</Text>
							<ArrowRightIcon size={16} weight="bold" color="#000" />
						</Pressable>

						<View style={styles.divider} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
							<View style={styles.dividerLine} />
							<Text style={styles.dividerText}>{label(s.or)}</Text>
							<View style={styles.dividerLine} />
						</View>

						<Pressable onPress={google} disabled={busy} accessibilityRole="button" style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
							<Text style={styles.secondaryLabel}>{s.google}</Text>
						</Pressable>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const createStyles = (t: Tokens) =>
	StyleSheet.create({
		root: { flex: 1, backgroundColor: t.bg },
		flex: { flex: 1 },
		content: { paddingTop: 20, paddingHorizontal: 24, paddingBottom: 32 },
		logo: { alignItems: 'center', marginTop: 40, marginBottom: 48 },
		form: { gap: 14 },
		field: { gap: 7 },
		label: { fontFamily: t.mono, fontSize: 11, letterSpacing: t.labelSpacing, color: t.muted, paddingHorizontal: 2 },
		pwHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingRight: 2 },
		link: { fontFamily: t.body, fontSize: 12, color: t.ink },
		input: {
			height: 50, borderRadius: 12, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface,
			color: t.text, paddingHorizontal: 14, fontFamily: t.body, fontSize: 15,
		},
		inputMono: { fontFamily: t.monoLatin, fontSize: 14, letterSpacing: 0.8 },
		inputFocused: { borderColor: t.accent },
		inputError: { borderColor: t.error },
		inputWithIcon: { paddingRight: 50 },
		eye: { position: 'absolute', right: 3, top: 3, width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
		error: { minHeight: 16, fontFamily: t.body, fontSize: 12, color: t.error, paddingHorizontal: 2 },
		primary: { height: 52, borderRadius: 14, backgroundColor: t.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
		primaryPressed: { opacity: 0.85 },
		primaryLabel: { fontFamily: t.mono, fontSize: 13, letterSpacing: t.labelSpacing, color: '#000' },
		divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
		dividerLine: { flex: 1, height: 1, backgroundColor: t.border },
		dividerText: { fontFamily: t.mono, fontSize: 11, letterSpacing: t.labelSpacing, color: t.faint },
		secondary: {
			height: 52, borderRadius: 14, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface,
			flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
		},
		secondaryLabel: { fontFamily: t.body, fontSize: 15, fontWeight: '500', color: t.text },
		googleIcon: { width: 18, height: 18 },
		pressed: { opacity: 0.6 },
	});
