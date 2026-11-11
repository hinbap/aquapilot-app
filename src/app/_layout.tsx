import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useFonts } from 'expo-font';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { NanumGothicCoding_400Regular, NanumGothicCoding_700Bold } from '@expo-google-fonts/nanum-gothic-coding';
import { SettingsProvider, useApp, useStyles } from '../lib/settings';
import type { Tokens } from '../lib/theme';

export default function RootLayout() {
	const [fontsLoaded] = useFonts({ JetBrainsMono_500Medium, NanumGothicCoding_400Regular, NanumGothicCoding_700Bold });

	useEffect(() => {
		// Every screen is portrait except the 3D viewer, which locks itself to landscape.
		ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => { });
	}, []);

	return (
		<SafeAreaProvider>
			<SettingsProvider>{fontsLoaded ? <AppStack /> : <Blank />}</SettingsProvider>
		</SafeAreaProvider>
	);
}

function AppStack() {
	const { t, ready } = useApp();
	const styles = useStyles(createStyles);
	if (!ready) return <View style={styles.root} />;
	return (
		<>
			<StatusBar style={t.isDark ? 'light' : 'dark'} />
			<Stack screenOptions={{ headerShown: false, contentStyle: styles.root, animation: 'fade' }}>
				<Stack.Screen name="index" />
				<Stack.Screen name="camera" options={{ animation: 'slide_from_bottom' }} />
				<Stack.Screen name="projects" options={{ animation: 'slide_from_right' }} />
				<Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
				<Stack.Screen name="login" options={{ animation: 'slide_from_bottom' }} />
				<Stack.Screen name="viewer/[id]" options={{ animation: 'fade', gestureEnabled: false }} />
			</Stack>
		</>
	);
}

function Blank() {
	return <View style={blank.root} />;
}

const createStyles = (t: Tokens) =>
	StyleSheet.create({
		root: { flex: 1, backgroundColor: t.bg },
	});

const blank = StyleSheet.create({
	root: { flex: 1, backgroundColor: '#000' },
});
