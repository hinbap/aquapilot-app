// Slowly turning preview of a project's real 3D model (the same geometry the viewer opens).
// Structure is drawn in the theme's line color, pipes and outlets in the accent. All tiles share one ~30 fps ticker.
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { getPreview, type Seg, type V3 } from '../lib/models';
import { useApp, useStyles } from '../lib/settings';
import type { Tokens } from '../lib/theme';

const listeners = new Set<(t: number) => void>();
let raf: number | null = null;
let t0 = 0;
let last = 0;
function subscribe(fn: (t: number) => void) {
	listeners.add(fn);
	if (raf == null) {
		t0 = Date.now();
		const tick = () => {
			raf = requestAnimationFrame(tick);
			const now = Date.now();
			if (now - last < 33) return;
			last = now;
			const t = (now - t0) / 1000;
			listeners.forEach((l) => l(t));
		};
		raf = requestAnimationFrame(tick);
	}
	return () => {
		listeners.delete(fn);
		if (!listeners.size && raf != null) {
			cancelAnimationFrame(raf);
			raf = null;
		}
	};
}

const PITCH = 0.5; // look down on the model a little
const CAMERA = 3.2; // perspective distance, in model radii
const FIT = 0.42; // model radius as a share of the tile's short side

export default function ProjectThumb({ projectId, phase = 0 }: { projectId: string; phase?: number }) {
	const { t: tk } = useApp();
	const styles = useStyles(createStyles);
	const preview = useMemo(() => getPreview(projectId), [projectId]);
	const [size, setSize] = useState({ w: 0, h: 0 });
	const [t, setT] = useState(0);
	useEffect(() => subscribe(setT), []);

	const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

	const drawing = useMemo(() => {
		const { w: W, h: H } = size;
		if (!W) return null;
		const ry = t * 0.35 + phase * 1.1;
		const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(PITCH), sx = Math.sin(PITCH);
		const sc = Math.min(W, H) * FIT, ox = W / 2, oy = H / 2;
		const proj = ([x, y, z]: V3): V3 => {
			const x1 = x * cy - z * sy, z1 = x * sy + z * cy;
			const y1 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
			const f = CAMERA / (CAMERA + z2);
			return [ox + x1 * sc * f, oy - y1 * sc * f, z2];
		};
		// Split lines into near / middle / far so depth reads without per-line opacity.
		const paths = (segs: Seg[]) => {
			const b = ['', '', ''];
			for (const [a, c] of segs) {
				const p = proj(a), q = proj(c);
				const d = (p[2] + q[2]) / 2;
				b[d < -0.35 ? 0 : d < 0.35 ? 1 : 2] += `M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
			}
			return b;
		};
		const floor: [number, number][] = [];
		for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) {
			const p = proj([i * 0.25, preview.floorY, j * 0.25]);
			floor.push([p[0], p[1]]);
		}
		return { structure: paths(preview.structure), pipes: paths(preview.pipes), floor };
	}, [preview, size, t, phase]);

	const line = tk.isDark ? '#E9E9ED' : '#1A1D20';

	return (
		<View style={styles.root} onLayout={onLayout}>
			{drawing && (
				<Svg width={size.w} height={size.h}>
					{drawing.floor.map(([x, y], i) => (
						<Circle key={i} cx={x} cy={y} r={0.9} fill={tk.accent} fillOpacity={0.16} />
					))}
					<Path d={drawing.structure[2]} stroke={line} strokeOpacity={0.12} strokeWidth={0.8} strokeLinecap="round" />
					<Path d={drawing.structure[1]} stroke={line} strokeOpacity={0.24} strokeWidth={0.8} strokeLinecap="round" />
					<Path d={drawing.structure[0]} stroke={line} strokeOpacity={0.4} strokeWidth={0.8} strokeLinecap="round" />
					<Path d={drawing.pipes[2]} stroke={tk.accent} strokeOpacity={0.45} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
					<Path d={drawing.pipes[1]} stroke={tk.accent} strokeOpacity={0.75} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
					<Path d={drawing.pipes[0]} stroke={tk.accent} strokeOpacity={1} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
				</Svg>
			)}
		</View>
	);
}

const createStyles = (_t: Tokens) =>
	StyleSheet.create({
		root: { flex: 1 },
	});
