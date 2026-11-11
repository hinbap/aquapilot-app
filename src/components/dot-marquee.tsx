// Scrolling LED dot-matrix "welcome back" in the accent color.
import React, { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View, useAnimatedValue, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp, useStyles } from '../lib/settings';
import type { Tokens } from '../lib/theme';

const GLYPHS: Record<string, string[]> = {
	w: ['.....', '.....', '#...#', '#...#', '#.#.#', '#.#.#', '.#.#.'],
	e: ['.....', '.....', '.###.', '#...#', '#####', '#....', '.###.'],
	l: ['.##..', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
	c: ['.....', '.....', '.###.', '#....', '#....', '#...#', '.###.'],
	o: ['.....', '.....', '.###.', '#...#', '#...#', '#...#', '.###.'],
	m: ['.....', '.....', '##.#.', '#.#.#', '#.#.#', '#...#', '#...#'],
	b: ['#....', '#....', '#.##.', '##..#', '#...#', '#...#', '####.'],
	a: ['.....', '.....', '.###.', '....#', '.####', '#...#', '.####'],
	k: ['#....', '#....', '#..#.', '#.#..', '##...', '#.#..', '#..#.'],
	' ': ['...', '...', '...', '...', '...', '...', '...'],
};

function buildColumns(text: string): boolean[][] {
	const cols: boolean[][] = [];
	for (const ch of text) {
		const g = GLYPHS[ch];
		if (!g) continue;
		for (let x = 0; x < g[0].length; x++) cols.push(g.map((row) => row[x] === '#'));
		cols.push(new Array(7).fill(false));
	}
	return cols;
}

const PITCH = 9;
const RADIUS = 3.1;
const SPEED = 36; // px per second
const HEIGHT = PITCH * 7;

export default function DotMarquee({ text = 'welcome back      ' }: { text?: string }) {
	const { t } = useApp();
	const styles = useStyles(createStyles);
	const { width } = useWindowDimensions();
	const cols = useMemo(() => buildColumns(text), [text]);
	const patternW = cols.length * PITCH;
	const copies = Math.ceil(width / patternW) + 1;
	const totalW = copies * patternW;
	const x = useAnimatedValue(0);
	const reveal = useAnimatedValue(0);

	useEffect(() => {
		Animated.timing(reveal, { toValue: 1, duration: 800, delay: 400, useNativeDriver: true }).start();
		const loop = Animated.loop(
			Animated.timing(x, { toValue: -patternW, duration: (patternW / SPEED) * 1000, easing: Easing.linear, useNativeDriver: true }),
		);
		loop.start();
		return () => loop.stop();
	}, [patternW, reveal, x]);

	const lit = useMemo(() => {
		const out: { cx: number; cy: number }[] = [];
		for (let c = 0; c < copies; c++)
			cols.forEach((col, i) =>
				col.forEach((on, y) => on && out.push({ cx: c * patternW + i * PITCH + PITCH / 2, cy: y * PITCH + PITCH / 2 })),
			);
		return out;
	}, [cols, copies, patternW]);

	return (
		<View style={[styles.root, { width }]}>
			<Animated.View style={[styles.strip, { width: totalW, transform: [{ translateX: x }] }]}>
				<Svg width={totalW} height={HEIGHT}>
					<Defs>
						<Pattern id="off" x="0" y="0" width={PITCH} height={PITCH} patternUnits="userSpaceOnUse">
							<Circle cx={PITCH / 2} cy={PITCH / 2} r={RADIUS} fill={t.accent} fillOpacity={0.08} />
						</Pattern>
					</Defs>
					<Rect x="0" y="0" width={totalW} height={HEIGHT} fill="url(#off)" />
				</Svg>
				<Animated.View style={[StyleSheet.absoluteFill, { opacity: reveal }]}>
					<Svg width={totalW} height={HEIGHT}>
						{lit.map((d, i) => (
							<Circle key={i} cx={d.cx} cy={d.cy} r={RADIUS} fill={t.accent} />
						))}
					</Svg>
				</Animated.View>
			</Animated.View>
			<LinearGradient colors={[t.bg, t.bg + '00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.fade, styles.fadeLeft]} pointerEvents="none" />
			<LinearGradient colors={[t.bg + '00', t.bg]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.fade, styles.fadeRight]} pointerEvents="none" />
		</View>
	);
}

const createStyles = (_t: Tokens) =>
	StyleSheet.create({
		root: { height: HEIGHT, overflow: 'hidden' },
		strip: { height: HEIGHT },
		fade: { position: 'absolute', top: 0, bottom: 0, width: 48 },
		fadeLeft: { left: 0 },
		fadeRight: { right: 0 },
	});
