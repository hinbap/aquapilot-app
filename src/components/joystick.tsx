// Virtual thumbstick. Reports x/y in -1…1 (y down). Pushing to the outer edge is "boost".
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View, useAnimatedValueXY } from 'react-native';
import { createSingleTouchHandlers } from '../lib/single-touch';
import { useStyles } from '../lib/settings';
import type { Tokens } from '../lib/theme';

export const STICK_SIZE = 128;
const KNOB = 52;
const TRAVEL = (STICK_SIZE - KNOB) / 2; // 38 px

export default function Joystick({ onChange, boost }: { onChange: (x: number, y: number) => void; boost: boolean }) {
	const styles = useStyles(createStyles);
	const knob = useAnimatedValueXY({ x: 0, y: 0 });
	const cb = useRef(onChange);
	useEffect(() => { cb.current = onChange; }, [onChange]);

	// Gesture callbacks run on touch events, never during render; the refs they use are read there.
	// eslint-disable-next-line react-hooks/refs -- refs are only read inside touch callbacks, not during render
	const [responder] = useState(() => {
		const start = { x: 0, y: 0, pageX: 0, pageY: 0 };
		const move = (px: number, py: number) => {
			let x = px / TRAVEL, y = py / TRAVEL;
			const m = Math.hypot(x, y);
			if (m > 1) { x /= m; y /= m; }
			knob.setValue({ x: x * TRAVEL, y: y * TRAVEL });
			cb.current(x, y);
		};
		const reset = () => {
			Animated.spring(knob, { toValue: { x: 0, y: 0 }, useNativeDriver: true, speed: 30, bounciness: 4 }).start();
			cb.current(0, 0);
		};
		return createSingleTouchHandlers({
			onStart: (touch) => {
				knob.stopAnimation();
				// where the thumb lands, relative to the stick's centre
				start.x = touch.locationX - STICK_SIZE / 2;
				start.y = touch.locationY - STICK_SIZE / 2;
				start.pageX = touch.pageX; start.pageY = touch.pageY;
				move(start.x, start.y);
			},
			onMove: (touch) => move(start.x + touch.pageX - start.pageX, start.y + touch.pageY - start.pageY),
			onEnd: reset,
		});
	});

	return (
		<View style={styles.base} {...responder} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
			<View pointerEvents="none" style={[styles.ring, boost && styles.ringBoost]} />
			<Animated.View pointerEvents="none" style={[styles.knob, boost && styles.knobBoost, { transform: knob.getTranslateTransform() }]} />
		</View>
	);
}

const createStyles = (t: Tokens) =>
	StyleSheet.create({
		base: {
			...(Platform.OS === 'web' ? { touchAction: 'none' } : {}),
			width: STICK_SIZE, height: STICK_SIZE, borderRadius: STICK_SIZE / 2,
			backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassBorder,
			alignItems: 'center', justifyContent: 'center',
		},
		ring: {
			...StyleSheet.absoluteFill, margin: 6, borderRadius: STICK_SIZE / 2,
			borderWidth: 1, borderStyle: 'dashed', borderColor: t.accentLine,
		},
		ringBoost: { borderColor: t.accent, borderStyle: 'solid', shadowColor: t.accent, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
		knob: {
			width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: t.knob, borderWidth: 1, borderColor: t.knobBorder,
			shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 7, shadowOffset: { width: 0, height: 4 },
		},
		knobBoost: { backgroundColor: t.accentGlow },
	});
