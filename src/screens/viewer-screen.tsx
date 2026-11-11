// Landscape 3D fly-through. Left thumb: joystick (edge = boost). Right side: drag to aim, pinch to zoom. ▲▼: rise / sink.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, PanResponder, Pressable, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';
import { ArrowLeftIcon, CaretDownIcon, CaretUpIcon, CrosshairIcon, ArrowsOutCardinalIcon } from 'phosphor-react-native';
import Joystick from '../components/joystick';
import { PROJECTS, projectName } from '../lib/data';
import { createGLRenderer } from '../lib/gl-renderer';
import { fmtLen, getModel, niceStep, type ModelInfo, type Seg, type V3 } from '../lib/models';
import { useApp, useStyles } from '../lib/settings';
import type { Tokens } from '../lib/theme';
import type { Strings } from '../lib/i18n';

type Label = { pos: THREE.Vector3; text: string; kind: 'pipe' | 'dim' };
type LabelView = { key: number; text: string; kind: 'pipe' | 'dim'; x: number; y: number; opacity: number };

type GLState = {
	gl: ExpoWebGLRenderingContext;
	renderer: THREE.WebGLRenderer;
	scene: THREE.Scene;
	camera: THREE.PerspectiveCamera;
	group: THREE.Group | null;
	dimGroup: THREE.Group | null;
	mats: { line: THREE.LineBasicMaterial; dim: THREE.LineBasicMaterial; pipe: THREE.MeshStandardMaterial; outlet: THREE.MeshStandardMaterial };
	labels: Label[];
	raf: number;
};

const LOOK_SPEED = 0.0045; // radians per px
const PINCH_SPEED = 0.006; // model-radii per px
const PINCH_RELEASE_DELAY_MS = 250;

export default function ViewerScreen({ projectId }: { projectId: string }) {
	const { t, s, settings } = useApp();
	const styles = useStyles(createStyles);
	const insets = useSafeAreaInsets();
	const project = PROJECTS.find((p) => p.id === projectId) ?? PROJECTS[0];
	const model = useMemo(() => getModel(project.id), [project.id]);

	// Android's system back gesture/button must not interrupt camera controls.
	// The on-screen back button still navigates explicitly through Expo Router.
	useFocusEffect(
		useCallback(() => {
			const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
			return () => subscription.remove();
		}, []),
	);

	// Lock to landscape while this screen is focused; back to portrait on leave.
	useFocusEffect(
		useCallback(() => {
			ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => { });
			return () => { ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => { }); };
		}, []),
	);

	// Camera + input state lives in a ref so the render loop never waits on React.
	const cam = useRef({ pos: [0, 0, 0] as V3, yaw: 0, pitch: 0, vel: [0, 0, 0] as V3, joy: [0, 0] as [number, number], vert: 0 });
	const resetView = useCallback(() => {
		const c = cam.current;
		c.yaw = 0.75; c.pitch = -0.38; c.vel = [0, 0, 0];
		const cp = Math.cos(c.pitch);
		const fw: V3 = [-Math.sin(c.yaw) * cp, Math.sin(c.pitch), -Math.cos(c.yaw) * cp];
		c.pos = [0, 1, 2].map((k) => model.center[k] - fw[k] * model.R * 1.9) as V3;
	}, [model]);
	useEffect(resetView, [resetView]);

	const radius = useRef(model.R);
	useEffect(() => { radius.current = model.R; }, [model.R]);

	const [size, setSize] = useState({ w: 0, h: 0 });
	const sizeRef = useRef(size);
	useEffect(() => { sizeRef.current = size; }, [size]);
	const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

	const [dimsOn, setDimsOn] = useState(true);
	const dimsRef = useRef(dimsOn);
	useEffect(() => { dimsRef.current = dimsOn; }, [dimsOn]);
	const [labels, setLabels] = useState<LabelView[]>([]);
	const [hud, setHud] = useState({ speed: '', boost: false, pos: '' });
	const [hint, setHint] = useState(true);
	const [failMsg, setFailMsg] = useState<string | null>(null);
	const glRef = useRef<GLState | null>(null);

	// ── scene (re)build: on first context, and whenever theme / accent / language change ──
	const build = useCallback(() => {
		const g = glRef.current;
		if (!g) return;
		const built = buildScene(g, model, t, s);
		g.labels = built.labels;
		if (g.dimGroup) g.dimGroup.visible = dimsRef.current;
	}, [model, t, s]);
	useEffect(build, [build]);

	// ── pointer: one finger looks around, two fingers pinch-zoom ──
	// Gesture callbacks run on touch events, not during render.
	// eslint-disable-next-line react-hooks/refs -- refs are only read inside touch callbacks, not during render
	const [look] = useState(() => {
		const last = { x: 0, y: 0 };
		const pinch: { d: number | null; resumeLookAt: number } = { d: null, resumeLookAt: 0 };
		const touches = (e: GestureResponderEvent) => e.nativeEvent.touches;
		const dist = (e: GestureResponderEvent) => {
			const [a, b] = touches(e);
			return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
		};
		const reset = () => { pinch.d = null; pinch.resumeLookAt = 0; };
		const syncTouches = (e: GestureResponderEvent) => {
			const active = touches(e);
			if (active.length >= 2) {
				pinch.d = dist(e);
				pinch.resumeLookAt = 0;
			} else {
				if (pinch.d !== null) pinch.resumeLookAt = Date.now() + PINCH_RELEASE_DELAY_MS;
				pinch.d = null;
			}
			if (active[0]) { last.x = active[0].pageX; last.y = active[0].pageY; }
		};
		return PanResponder.create({
			onStartShouldSetPanResponder: () => true,
			onMoveShouldSetPanResponder: () => true,
			onPanResponderGrant: (e) => {
				reset();
				syncTouches(e);
			},
			onPanResponderStart: syncTouches,
			onPanResponderEnd: syncTouches,
			onPanResponderRelease: reset,
			onPanResponderTerminate: reset,
			onPanResponderMove: (e) => {
				const c = cam.current;
				if (touches(e).length >= 2) {
					const d = dist(e);
					if (pinch.d !== null) {
						const cp = Math.cos(c.pitch);
						const fw: V3 = [-Math.sin(c.yaw) * cp, Math.sin(c.pitch), -Math.cos(c.yaw) * cp];
						const amount = (d - pinch.d) * PINCH_SPEED * radius.current;
						for (let i = 0; i < 3; i++) c.pos[i] += fw[i] * amount;
					}
					pinch.d = d;
					pinch.resumeLookAt = 0;
				} else {
					const [touch] = touches(e);
					if (!touch) return;
					if (pinch.d !== null) syncTouches(e);
					const x = touch.pageX, y = touch.pageY;
					// Ignore staggered finger lifts, then rebase once before looking again.
					// Use the remaining touch, since the event itself may describe the lifted one.
					if (pinch.resumeLookAt) {
						last.x = x; last.y = y;
						if (Date.now() >= pinch.resumeLookAt) pinch.resumeLookAt = 0;
						return;
					}
					c.yaw -= (x - last.x) * LOOK_SPEED;
					c.pitch = Math.max(-1.5, Math.min(1.5, c.pitch - (y - last.y) * LOOK_SPEED));
					last.x = x; last.y = y;
				}
				setHint(false);
			},
		});
	});

	// ── GL context + render loop ──
	const onContextCreate = useCallback(
		(gl: ExpoWebGLRenderingContext) => {
			// GLView remounts when its key (screen size) changes; retire the old loop + context first.
			teardownGL(glRef.current);
			glRef.current = null;
			try {
				const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
				const renderer = createGLRenderer(gl);

				const scene = new THREE.Scene();
				scene.fog = new THREE.Fog(0x000000, 10, 100);
				scene.add(new THREE.AmbientLight(0xffffff, 0.55));
				const sun = new THREE.DirectionalLight(0xffffff, 0.9);
				sun.position.set(0.6, 1, 0.4);
				scene.add(sun);
				const camera = new THREE.PerspectiveCamera(62, w / h, 0.01, 1000);
				camera.rotation.order = 'YXZ';

				glRef.current = {
					gl, renderer, scene, camera, group: null, dimGroup: null, labels: [], raf: 0,
					mats: {
						line: new THREE.LineBasicMaterial({ transparent: true }),
						dim: new THREE.LineBasicMaterial({ transparent: true, opacity: 0.6 }),
						pipe: new THREE.MeshStandardMaterial({ emissiveIntensity: 0.22, roughness: 0.45, metalness: 0.15 }),
						outlet: new THREE.MeshStandardMaterial({ emissiveIntensity: 0.12, roughness: 0.6, metalness: 0.3 }),
					},
				};
				build();

				const vec = new THREE.Vector3();
				let lastT = Date.now(), frame = 0;
				const loop = () => {
					const g = glRef.current;
					if (!g || g.renderer !== renderer) return; // superseded by a newer context
					g.raf = requestAnimationFrame(loop);
					const now = Date.now(), dt = Math.min(0.05, (now - lastT) / 1000);
					lastT = now; frame++;
					const c = cam.current;

					let [jx, jy] = c.joy;
					let mag = Math.hypot(jx, jy);
					if (mag > 1) { jx /= mag; jy /= mag; mag = 1; }
					const boost = mag >= 0.95;
					const speed = model.R * 0.55 * Math.pow(mag, 1.5) * (boost ? 2.8 : 1);
					const cp = Math.cos(c.pitch);
					const fw: V3 = [-Math.sin(c.yaw) * cp, Math.sin(c.pitch), -Math.cos(c.yaw) * cp];
					const rt: V3 = [Math.cos(c.yaw), 0, -Math.sin(c.yaw)];
					const ease = 1 - Math.exp(-dt * 7);
					for (let i = 0; i < 3; i++) {
						const target = (fw[i] * -jy + rt[i] * jx) * speed + (i === 1 ? c.vert * model.R * 0.4 : 0);
						c.vel[i] += (target - c.vel[i]) * ease;
						c.pos[i] += c.vel[i] * dt;
					}

					g.camera.position.set(c.pos[0], c.pos[1], c.pos[2]);
					g.camera.rotation.set(c.pitch, c.yaw, 0);
					g.renderer.render(g.scene, g.camera);
					g.gl.endFrameEXP();

					// HUD + dimension labels at ~15 fps
					if (frame % 4 === 0) {
						const { w: W, h: H } = sizeRef.current;
						if (dimsRef.current && W) {
							setLabels(
								g.labels.map((l, key) => {
									vec.copy(l.pos);
									const d = vec.distanceTo(g.camera.position);
									vec.project(g.camera);
									const vis = vec.z < 1 && Math.abs(vec.x) < 1.1 && Math.abs(vec.y) < 1.1 && d < model.R * 4.5;
									return {
										key, text: l.text, kind: l.kind,
										x: ((vec.x + 1) / 2) * W, y: ((1 - vec.y) / 2) * H,
										opacity: vis ? Math.max(0.35, Math.min(1, 1.4 - d / (model.R * 4))) : 0,
									};
								}),
							);
						}
						const f = (x: number) => (x >= 0 ? ' ' : '') + x.toFixed(model.R < 3 ? 2 : 1);
						const heading = Math.round((((-c.yaw * 180) / Math.PI) % 360 + 360) % 360);
						const speedText = mag < 0.03 ? '' : `${boost ? s.boost + ' · ' : ''}${speed < 10 ? speed.toFixed(2) : speed.toFixed(1)} m/s`;
						setHud((prev) => {
							const pos = `X${f(c.pos[0])}   Y${f(c.pos[1])}   Z${f(c.pos[2])}   ·   ${heading}°`;
							return prev.speed === speedText && prev.boost === boost && prev.pos === pos ? prev : { speed: speedText, boost, pos };
						});
					}
				};
				loop();
			} catch (e) {
				teardownGL(glRef.current);
				glRef.current = null;
				// Surface the real cause — a bare catch here makes engine failures undiagnosable.
				console.error('3D engine failed to start:', e);
				setFailMsg(e instanceof Error ? e.message : String(e));
			}
		},
		[build, model, s.boost],
	);

	useEffect(() => () => {
		teardownGL(glRef.current);
		glRef.current = null;
	}, []);

	const toggleDims = () => {
		const next = !dimsOn;
		setDimsOn(next);
		if (glRef.current?.dimGroup) glRef.current.dimGroup.visible = next;
	};

	const landscape = size.w > size.h && size.w > 0;
	const fz = (x: number) => (x < 2 ? x.toFixed(2) : x.toFixed(0));
	const meta = `${fz(model.size[0])} × ${fz(model.size[2])} × ${fz(model.size[1])} m · ${model.S.length + model.pipes.length} ${s.elements}`;
	const label = (x: string) => (t.upper ? x.toUpperCase() : x);
	const side = { left: Math.max(insets.left, 20) + 24, right: Math.max(insets.right, 20) + 24 };

	return (
		<View style={styles.root} onLayout={onLayout}>
			{/* Mount GL only once the screen has rotated, so the drawing buffer is landscape-sized. */}
			{landscape && !failMsg && <GLView key={`${size.w}x${size.h}`} style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} />}
			{failMsg && (
				<View style={styles.errorWrap}>
					<Text style={styles.error}>{s.engineError}</Text>
					<Text style={styles.errorDetail}>{failMsg}</Text>
				</View>
			)}

			{dimsOn && (
				<View style={StyleSheet.absoluteFill} pointerEvents="none">
					{labels.map((l) =>
						l.opacity > 0 ? (
							// position comes from the 3D projection every frame, so it's the one inline style
							<View key={l.key} style={[styles.labelWrap, { left: l.x, top: l.y, opacity: l.opacity }]}>
								<Text style={[styles.label, l.kind === 'pipe' ? styles.labelPipe : styles.labelDim]}>{l.text}</Text>
							</View>
						) : null,
					)}
				</View>
			)}

			<View style={StyleSheet.absoluteFill} {...look.panHandlers} />

			<View style={styles.crosshair} pointerEvents="none">
				<View style={styles.crossV} />
				<View style={styles.crossH} />
			</View>

			<View style={[styles.topLeft, { left: side.left }]}>
				<Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={s.back} style={({ pressed }) => [styles.roundBtn, pressed && styles.pressed]}>
					<ArrowLeftIcon size={14} weight="bold" color={t.text} />
				</Pressable>
				<View style={styles.titleBlock}>
					<Text style={styles.title}>{projectName(project, settings.lang)}</Text>
					<Text style={styles.meta}>{label(meta)}</Text>
				</View>
			</View>

			<View style={[styles.topRight, { right: side.right }]}>
				<Pressable
					onPress={toggleDims}
					accessibilityRole="switch"
					accessibilityState={{ checked: dimsOn }}
					style={({ pressed }) => [styles.pill, dimsOn && styles.pillOn, pressed && styles.pressed]}
				>
					<ArrowsOutCardinalIcon size={12} color={dimsOn ? t.ink : t.muted} />
					<Text style={[styles.pillLabel, dimsOn && styles.pillLabelOn]}>{label(s.dims)}</Text>
				</Pressable>
				<Pressable onPress={resetView} accessibilityRole="button" accessibilityLabel={s.resetView} style={({ pressed }) => [styles.smallRoundBtn, pressed && styles.pressed]}>
					<CrosshairIcon size={14} color={t.text} />
				</Pressable>
			</View>

			<View style={[styles.stickArea, { left: side.left }]}>
				<Joystick boost={hud.boost} onChange={(x, y) => { cam.current.joy = [x, y]; }} />
				<Text style={[styles.speed, hud.boost && styles.speedBoost]}>{hud.speed}</Text>
			</View>

			<View style={[styles.flyButtons, { right: side.right }]}>
				{([[1, s.flyUp, CaretUpIcon], [-1, s.flyDown, CaretDownIcon]] as const).map(([dir, name, Icon]) => (
					<Pressable
						key={dir}
						accessibilityRole="button"
						accessibilityLabel={name}
						onPressIn={() => { cam.current.vert = dir; }}
						onPressOut={() => { cam.current.vert = 0; }}
						style={({ pressed }) => [styles.flyBtn, pressed && styles.flyBtnOn]}
					>
						{({ pressed }) => <Icon size={16} weight="bold" color={pressed ? t.ink : t.text} />}
					</Pressable>
				))}
			</View>

			{hint && (
				<View style={[styles.hint, { right: side.right + 76 }]} pointerEvents="none">
					<Text style={styles.hintText}>{label(s.dragToLook)}</Text>
				</View>
			)}

			<Text style={styles.pos} pointerEvents="none">{hud.pos}</Text>
		</View>
	);
}

// ───────────────────────── scene construction ─────────────────────────

function disposeGroup(group: THREE.Group | null) {
	group?.traverse((o) => {
		const m = o as THREE.Mesh;
		if (m.geometry) m.geometry.dispose();
	});
}

function teardownGL(g: GLState | null) {
	if (!g) return;
	cancelAnimationFrame(g.raf);
	try {
		disposeGroup(g.group);
		g.renderer.dispose();
	} catch {
		// the context may already be destroyed after a GLView remount
	}
}

function segGeometry(segs: Seg[]) {
	const arr = new Float32Array(segs.length * 6);
	segs.forEach(([a, b], j) => { arr.set(a, j * 6); arr.set(b, j * 6 + 3); });
	const geo = new THREE.BufferGeometry();
	geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
	return geo;
}

function buildScene(g: GLState, m: ModelInfo, t: Tokens, s: Strings): { labels: Label[] } {
	const { mats } = g;
	g.scene.background = new THREE.Color(t.scene);
	(g.scene.fog as THREE.Fog).color.setHex(t.scene);
	(g.scene.fog as THREE.Fog).near = m.R * 2.2;
	(g.scene.fog as THREE.Fog).far = m.R * 7;
	g.camera.near = m.R * 0.002;
	g.camera.far = m.R * 40;
	g.camera.updateProjectionMatrix();
	mats.line.color.setHex(t.line); mats.line.opacity = t.lineOpacity;
	mats.dim.color.setHex(t.dimLine);
	mats.pipe.color.setHex(t.accentNum); mats.pipe.emissive.setHex(t.accentNum);
	mats.outlet.color.setHex(t.outlet); mats.outlet.emissive.setHex(t.accentNum);

	if (g.group) { g.scene.remove(g.group); disposeGroup(g.group); }
	const group = new THREE.Group();
	const dimGroup = new THREE.Group();
	group.add(dimGroup);
	const labels: Label[] = [];

	group.add(new THREE.LineSegments(segGeometry(m.S), mats.line));

	const up = new THREE.Vector3(0, 1, 0);
	const tube = (a: V3, b: V3, r: number) => {
		const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
		const d = B.clone().sub(A);
		const len = d.length();
		if (len < 1e-6) return;
		const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 14, 1), mats.pipe);
		mesh.position.copy(A).add(B).multiplyScalar(0.5);
		mesh.quaternion.setFromUnitVectors(up, d.normalize());
		group.add(mesh);
	};

	// Pipes: real diameter, sphere at each bend, label "Ø<mm> · <total run length>"
	for (const p of m.pipes) {
		const r = p.d / 2;
		let total = 0, best = 0, bi = 0;
		for (let j = 0; j < p.pts.length - 1; j++) {
			tube(p.pts[j], p.pts[j + 1], r);
			const l = Math.hypot(p.pts[j + 1][0] - p.pts[j][0], p.pts[j + 1][1] - p.pts[j][1], p.pts[j + 1][2] - p.pts[j][2]);
			total += l;
			if (l > best) { best = l; bi = j; }
		}
		for (let j = 1; j < p.pts.length - 1; j++) {
			const sph = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), mats.pipe);
			sph.position.set(...p.pts[j]);
			group.add(sph);
		}
		if (p.label) {
			const a = p.pts[bi], b = p.pts[bi + 1];
			labels.push({ pos: new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + p.d * 1.5, (a[2] + b[2]) / 2), text: `Ø${Math.round(p.d * 1000)} · ${fmtLen(total)}`, kind: 'pipe' });
		}
	}

	for (const o of m.outlets) {
		const c = new THREE.Mesh(new THREE.CylinderGeometry(o.d / 2, (o.d / 2) * 0.85, o.h, 28, 1), mats.outlet);
		c.position.set(o.p[0], o.p[1] + o.h / 2, o.p[2]);
		group.add(c);
		if (o.label) labels.push({ pos: new THREE.Vector3(o.p[0] + o.d * 0.7, o.p[1] + o.h + o.d * 0.25, o.p[2]), text: `Ø${Math.round(o.d * 1000)} ${s.outlet}`, kind: 'pipe' });
	}

	// Linear dimensions: extension lines, dimension line, end ticks, length label
	const dsegs: Seg[] = [];
	const tick = m.R * 0.012;
	const add = (p: V3, q: V3, k: number): V3 => [p[0] + q[0] * k, p[1] + q[1] * k, p[2] + q[2] * k];
	for (const dm of m.dims) {
		const a = add(dm.a, dm.off, 1), b = add(dm.b, dm.off, 1);
		const ol = Math.hypot(...dm.off) || 1;
		const on: V3 = [dm.off[0] / ol, dm.off[1] / ol, dm.off[2] / ol];
		dsegs.push([add(dm.a, on, ol * 0.15), add(a, on, tick * 2)]);
		dsegs.push([add(dm.b, on, ol * 0.15), add(b, on, tick * 2)]);
		dsegs.push([a, b]);
		const dir: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
		const dl = Math.hypot(...dir);
		const u: V3 = [dir[0] / dl, dir[1] / dl, dir[2] / dl];
		const diag: V3 = [u[0] + on[0], u[1] + on[1], u[2] + on[2]];
		for (const p of [a, b]) dsegs.push([add(p, diag, -tick), add(p, diag, tick)]);
		labels.push({
			pos: new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2),
			text: fmtLen(Math.hypot(dm.b[0] - dm.a[0], dm.b[1] - dm.a[1], dm.b[2] - dm.a[2])),
			kind: 'dim',
		});
	}
	dimGroup.add(new THREE.LineSegments(segGeometry(dsegs), mats.dim));

	// Ground grid sized to the project
	const step = niceStep(m.R / 4), n = Math.ceil((m.R * 3) / step);
	const gridA = new THREE.Color(t.accentNum).lerp(new THREE.Color(t.scene), t.gridMix);
	const grid = new THREE.GridHelper(n * step, n, gridA, new THREE.Color(t.gridB));
	(grid.material as THREE.Material).transparent = true;
	(grid.material as THREE.Material).opacity = 0.7;
	grid.position.set(Math.round(m.center[0] / step) * step, m.lo[1] - m.R * 0.004, Math.round(m.center[2] / step) * step);
	group.add(grid);

	g.scene.add(group);
	g.group = group;
	g.dimGroup = dimGroup;
	return { labels };
}

const createStyles = (t: Tokens) =>
	StyleSheet.create({
		root: { flex: 1, backgroundColor: t.bg },
		errorWrap: { position: 'absolute', alignSelf: 'center', top: '44%', alignItems: 'center', gap: 8, maxWidth: '78%' },
		error: { fontFamily: t.body, fontSize: 14, color: t.muted, textAlign: 'center' },
		errorDetail: { fontFamily: t.mono, fontSize: 10, lineHeight: 15, letterSpacing: 0.5, color: t.faint, textAlign: 'center' },
		pressed: { opacity: 0.6 },
		labelWrap: { position: 'absolute', transform: [{ translateX: '-50%' }, { translateY: '-50%' }] },
		label: {
			fontFamily: t.monoLatin, fontSize: 10, letterSpacing: 0.4, paddingVertical: 3, paddingHorizontal: 7,
			borderRadius: 5, borderWidth: 1, overflow: 'hidden', backgroundColor: t.labelBg,
		},
		labelPipe: { color: t.ink, borderColor: t.accentLine },
		labelDim: { color: t.labelText, borderColor: t.labelBorder },
		crosshair: { position: 'absolute', left: '50%', top: '50%', width: 16, height: 16, marginLeft: -8, marginTop: -8, opacity: 0.6 },
		crossV: { position: 'absolute', left: 7.5, top: 0, width: 1, height: 16, backgroundColor: t.accent },
		crossH: { position: 'absolute', top: 7.5, left: 0, width: 16, height: 1, backgroundColor: t.accent },
		topLeft: { position: 'absolute', top: 22, flexDirection: 'row', alignItems: 'center', gap: 12 },
		roundBtn: {
			width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: t.glassBorder, backgroundColor: t.glass,
			alignItems: 'center', justifyContent: 'center',
		},
		titleBlock: { gap: 3 },
		title: { fontFamily: t.body, fontSize: 15, fontWeight: '500', color: t.text },
		meta: { fontFamily: t.mono, fontSize: 10, letterSpacing: 1, color: t.muted },
		topRight: { position: 'absolute', top: 22, flexDirection: 'row', alignItems: 'center', gap: 6 },
		pill: {
			height: 30, paddingHorizontal: 11, borderRadius: 999, borderWidth: 1, borderColor: t.glassBorder, backgroundColor: t.glass,
			flexDirection: 'row', alignItems: 'center', gap: 6,
		},
		pillOn: { borderColor: t.accent },
		pillLabel: { fontFamily: t.mono, fontSize: 10, letterSpacing: 1, color: t.muted },
		pillLabelOn: { color: t.ink },
		smallRoundBtn: {
			width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: t.glassBorder, backgroundColor: t.glass,
			alignItems: 'center', justifyContent: 'center',
		},
		stickArea: { position: 'absolute', bottom: 22, alignItems: 'center', gap: 8 },
		speed: { minHeight: 13, fontFamily: t.monoLatin, fontSize: 10, letterSpacing: 1.4, color: t.muted },
		speedBoost: { color: t.ink },
		flyButtons: { position: 'absolute', bottom: 34, gap: 10 },
		flyBtn: {
			width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: t.glassBorder, backgroundColor: t.glass,
			alignItems: 'center', justifyContent: 'center',
		},
		flyBtnOn: { borderColor: t.accent, backgroundColor: t.accentSoft },
		hint: { position: 'absolute', bottom: 52 },
		hintText: { fontFamily: t.mono, fontSize: 10, letterSpacing: 1.4, color: t.muted },
		pos: { position: 'absolute', bottom: 10, alignSelf: 'center', fontFamily: t.monoLatin, fontSize: 10, letterSpacing: 0.8, color: t.faint },
	});
