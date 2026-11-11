// The "a" mark with the accent dot. Fades in, then the dot blinks like a cursor.
import { useEffect } from 'react';
import { Animated, Easing, StyleSheet, useAnimatedValue } from 'react-native';
import { useApp, useStyles } from '../lib/settings';
import type { Tokens } from '../lib/theme';

import LOGO from '../../assets/images/a-white.png';

export default function LogoMark({ size = 104 }: { size?: number }) {
	const { t } = useApp();
	const styles = useStyles(createStyles);
	const fade = useAnimatedValue(0);
	const blink = useAnimatedValue(0);

	useEffect(() => {
		Animated.timing(fade, { toValue: 1, duration: 800, delay: 150, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
		const loop = Animated.sequence([
			Animated.delay(1000),
			Animated.loop(
				Animated.sequence([
					Animated.timing(blink, { toValue: 1, duration: 0, useNativeDriver: true }),
					Animated.delay(600),
					Animated.timing(blink, { toValue: 0.15, duration: 0, useNativeDriver: true }),
					Animated.delay(600),
				]),
			),
		]);
		loop.start();
		return () => loop.stop();
	}, [fade, blink]);

	const h = size * 0.7625;
	const dot = size * 0.223;
	const translateY = fade.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });

	// Size-dependent geometry and animated values are the only inline styles here.
	return (
		<Animated.View style={[styles.wrap, { width: size, height: h, opacity: fade, transform: [{ translateY }] }]}>
			<Animated.Image
				source={LOGO}
				resizeMode="contain"
				accessibilityLabel="AquaPilot"
				style={[styles.glyph, { width: size * 0.741, height: h, tintColor: t.text }]}
			/>
			<Animated.View
				style={[styles.dot, { left: size * 0.777, top: h * 0.707, width: dot, height: dot, borderRadius: dot / 2, opacity: blink }]}
			/>
		</Animated.View>
	);
}

const createStyles = (t: Tokens) =>
	StyleSheet.create({
		wrap: { position: 'relative' },
		glyph: { position: 'absolute', left: 0, top: 0 },
		dot: {
			position: 'absolute',
			backgroundColor: t.accent,
			shadowColor: t.accent,
			shadowOpacity: 0.6,
			shadowRadius: 8,
			shadowOffset: { width: 0, height: 0 },
		},
	});
