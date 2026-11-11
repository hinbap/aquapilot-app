// Project geometry in real-world meters (y = up). The 3D viewer and the list previews both draw from it.

export type V3 = [number, number, number];
export type Seg = [V3, V3];

// ───────────────────────── 3D viewer models ─────────────────────────
export type Pipe = { pts: V3[]; d: number; label?: boolean }; // d = outer diameter in meters
export type Outlet = { p: V3; d: number; h: number; label?: boolean };
export type Dim = { a: V3; b: V3; off: V3 }; // linear dimension a→b, drawn offset by `off`
export type Model = { S: Seg[]; pipes: Pipe[]; outlets: Outlet[]; dims: Dim[] };
export type ModelInfo = Model & { center: V3; lo: V3; size: V3; R: number };

const L = (o: Seg[], a: V3, b: V3) => { o.push([a, b]); };
const poly = (o: Seg[], pts: V3[]) => { for (let i = 0; i < pts.length - 1; i++) L(o, pts[i], pts[i + 1]); };
const rectY = (o: Seg[], x0: number, x1: number, z0: number, z1: number, y: number) =>
	poly(o, [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [x0, y, z0]]);
const box3 = (o: Seg[], x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => {
	rectY(o, x0, x1, z0, z1, y0); rectY(o, x0, x1, z0, z1, y1);
	for (const x of [x0, x1]) for (const z of [z0, z1]) L(o, [x, y0, z], [x, y1, z]);
};
const empty = (): Model => ({ S: [], pipes: [], outlets: [], dims: [] });

function harbor(): Model {
	const m = empty(), S = m.S;
	const W = 30, D = 18, E = 10, RH = 12, roofY = (z: number) => E + (RH - E) * (1 - Math.abs(z) / D);
	rectY(S, -W, W, -D, D, 0);
	for (let x = -W; x <= W; x += 6) { L(S, [x, 0, -D], [x, E, -D]); L(S, [x, 0, D], [x, E, D]); poly(S, [[x, E, -D], [x, RH, 0], [x, E, D]]); }
	for (const z of [-D, -12, -6, 0, 6, 12, D]) L(S, [-W, roofY(z), z], [W, roofY(z), z]);
	for (const x of [-W, W]) for (const z of [-9, 0, 9]) L(S, [x, 0, z], [x, roofY(z), z]);
	for (const x of [-21, -9, 3, 15]) poly(S, [[x - 2, 0, D], [x - 2, 4.5, D], [x + 2, 4.5, D], [x + 2, 0, D]]);
	rectY(S, -28, -14, -16, -4, 4);
	for (const [x, z] of [[-28, -16], [-14, -16], [-14, -4], [-28, -4]]) L(S, [x, 0, z], [x, 4, z]);
	for (const z of [-10, -5, 1, 6]) {
		for (const y of [0, 2, 4, 6]) rectY(S, -6, 26, z, z + 1.2, y);
		for (let x = -6; x <= 26; x += 4) { L(S, [x, 0, z], [x, 6, z]); L(S, [x, 0, z + 1.2], [x, 6, z + 1.2]); }
	}
	for (const s of [-1, 1]) {
		const zg = s * (D - 0.6), yc = E - 1.1;
		for (const x of [-25, -15, -5, 5, 15, 25]) { m.outlets.push({ p: [x, E, zg], d: 0.3, h: 0.06 }); m.pipes.push({ pts: [[x, E, zg], [x, yc, zg]], d: 0.056 }); }
		m.pipes.push({ pts: [[-25, yc, zg], [W - 0.6, yc, zg]], d: 0.125, label: true });
		m.pipes.push({ pts: [[W - 0.6, yc, zg], [W - 0.6, 0.4, zg], [W + 4, -1.2, zg]], d: 0.16, label: true });
	}
	m.dims.push({ a: [-W, 0, D], b: [W, 0, D], off: [0, 0, 4] });
	m.dims.push({ a: [W, 0, -D], b: [W, 0, D], off: [6, 0, 0] });
	m.dims.push({ a: [-W, 0, D], b: [-W, E, D], off: [-3, 0, 0] });
	m.dims.push({ a: [-W, E, -D], b: [-W + 6, E, -D], off: [0, 2, 0] });
	return m;
}

function drain(): Model {
	const m = empty(), S = m.S;
	rectY(S, -0.6, 0.6, -0.6, 0.6, 0); rectY(S, -0.6, 0.6, -0.6, 0.6, -0.12); rectY(S, -0.6, 0.6, -0.6, 0.6, -0.2);
	for (const x of [-0.6, 0.6]) for (const z of [-0.6, 0.6]) L(S, [x, -0.2, z], [x, 0, z]);
	for (let i = -5; i <= 5; i++) L(S, [i * 0.1, -0.2, -0.6], [i * 0.1, -0.2, 0.6]);
	for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; L(S, [Math.cos(a) * 0.1, 0.012, Math.sin(a) * 0.1], [Math.cos(a) * 0.1, 0.07, Math.sin(a) * 0.1]); }
	m.outlets.push({ p: [0, 0, 0], d: 0.3, h: 0.024, label: true });
	m.outlets.push({ p: [0, 0.07, 0], d: 0.22, h: 0.006 });
	m.pipes.push({ pts: [[0, -0.01, 0], [0, -0.35, 0], [0.7, -0.35, 0]], d: 0.056, label: true });
	m.dims.push({ a: [-0.6, 0, 0.6], b: [0.6, 0, 0.6], off: [0, 0, 0.18] });
	m.dims.push({ a: [0, 0, -0.16], b: [0, -0.35, -0.16], off: [-0.25, 0, 0] });
	m.dims.push({ a: [-0.6, -0.2, -0.6], b: [-0.6, 0, -0.6], off: [-0.12, 0, 0] });
	return m;
}

function tower(): Model {
	const m = empty(), S = m.S;
	const w = 10, base = 7.2, n = 20, fh = 3.6, top = base + n * fh;
	box3(S, -17, 17, 0, base, -14, 14); rectY(S, -17, 17, -14, 14, 3.6);
	for (let i = 0; i <= n; i++) rectY(S, -w, w, -w, w, base + i * fh);
	const cols = [-10, -10 / 3, 10 / 3, 10], seen = new Set<string>();
	for (const c of cols) for (const [x, z] of [[c, -w], [c, w], [-w, c], [w, c]]) {
		const k = x.toFixed(2) + ',' + z.toFixed(2); if (seen.has(k)) continue; seen.add(k);
		L(S, [x, base, z], [x, top, z]);
	}
	box3(S, -3, 3, 0, top, -3, 3); box3(S, -2, 6, top, top + 4, -2.5, 4.5);
	const y = top - 0.6;
	for (const x of [-7, 7]) for (const z of [-7, 7]) { m.outlets.push({ p: [x, top, z], d: 0.3, h: 0.06 }); m.pipes.push({ pts: [[x, top, z], [x, y, z]], d: 0.075 }); }
	for (const x of [-7, 7]) m.pipes.push({ pts: [[x, y, -7], [x, y, 7]], d: 0.11, label: x > 0 });
	m.pipes.push({ pts: [[-7, y, 0], [7, y, 0]], d: 0.125 });
	m.pipes.push({ pts: [[2.4, y, 0], [2.4, 0.4, 0], [2.4, -1.5, 0], [2.4, -1.5, 18]], d: 0.16, label: true });
	for (const z of [-11, 11]) {
		for (const x of [-14, -4, 6]) { m.outlets.push({ p: [x, base, z], d: 0.25, h: 0.05 }); m.pipes.push({ pts: [[x, base, z], [x, base - 0.6, z]], d: 0.056 }); }
		m.pipes.push({ pts: [[-14, base - 0.6, z], [16, base - 0.6, z], [16, 0.4, z]], d: 0.09, label: z > 0 });
	}
	m.dims.push({ a: [w, base, w], b: [w, top, w], off: [4, 0, 0] });
	m.dims.push({ a: [-17, 0, 14], b: [17, 0, 14], off: [0, 0, 4] });
	m.dims.push({ a: [-w, top, -w], b: [w, top, -w], off: [0, 0, -3] });
	return m;
}

function pipesRun(): Model {
	const m = empty(), S = m.S;
	rectY(S, -15, 15, -9, 9, 0); rectY(S, -15, 15, -9, 9, 3.6);
	for (let x = -15; x <= 15; x += 6) for (const z of [-9, -3, 3, 9]) L(S, [x, 0, z], [x, 3.6, z]);
	box3(S, 9, 13, 0, 3.6, -9, -5);
	const y = 3.15;
	for (const x of [-11, -5, 1, 7]) { m.outlets.push({ p: [x, 3.6, -6], d: 0.16, h: 0.03 }); m.pipes.push({ pts: [[x, 3.6, -6], [x, y, -6]], d: 0.075 }); }
	m.pipes.push({ pts: [[-11, y, -6], [11, y, -6], [11, y, 4], [14, y, 4], [14, 0.3, 4]], d: 0.125, label: true });
	for (const x of [-8, -2, 4]) { m.outlets.push({ p: [x, 3.6, 5], d: 0.16, h: 0.03 }); m.pipes.push({ pts: [[x, 3.6, 5], [x, y - 0.25, 5]], d: 0.075 }); }
	m.pipes.push({ pts: [[-8, y - 0.25, 5], [11, y - 0.25, 5], [11, y, 4]], d: 0.09, label: true });
	m.dims.push({ a: [-15, 0, 9], b: [15, 0, 9], off: [0, 0, 2.5] });
	m.dims.push({ a: [15, 0, -9], b: [15, 0, 9], off: [2.5, 0, 0] });
	m.dims.push({ a: [-15, 0, -9], b: [-15, 3.6, -9], off: [-1.6, 0, 0] });
	return m;
}

function library(): Model {
	const m = empty(), S = m.S;
	box3(S, -14, 14, 0, 5, -10, 10); box3(S, -10, 8, 5, 10, -8, 6); box3(S, -6, 4, 10, 16, -5, 3);
	for (let x = -14; x <= 14; x += 4) L(S, [x, 0, 10], [x, 5, 10]);
	rectY(S, -12, -4, 10, 10, 2.4);
	const tiers: V3[][] = [[[-12, 5, 8], [12, 5, 8], [12, 5, -8]], [[-8, 10, 4], [6, 10, 4]], [[-4, 16, 1.5], [2, 16, 1.5]]];
	tiers.forEach((pts) => pts.forEach((p) => { m.outlets.push({ p, d: 0.25, h: 0.05 }); m.pipes.push({ pts: [p, [p[0], p[1] - 0.6, p[2]]], d: 0.075 }); }));
	m.pipes.push({ pts: [[-12, 4.4, 8], [12, 4.4, 8], [13, 4.4, 8], [13, 0.3, 8]], d: 0.11, label: true });
	m.pipes.push({ pts: [[12, 4.4, -8], [12, 4.4, 8]], d: 0.09 });
	m.pipes.push({ pts: [[-8, 9.4, 4], [7, 9.4, 4], [7, 9.4, 5.5], [7, 5.3, 5.5]], d: 0.09, label: true });
	m.pipes.push({ pts: [[-4, 15.4, 1.5], [3.4, 15.4, 1.5], [3.4, 10.3, 1.5]], d: 0.075 });
	m.dims.push({ a: [-14, 0, 10], b: [14, 0, 10], off: [0, 0, 3] });
	m.dims.push({ a: [14, 0, -10], b: [14, 0, 10], off: [3, 0, 0] });
	m.dims.push({ a: [-6, 0, -5], b: [-6, 16, -5], off: [-9, 0, 0] });
	return m;
}

function outletLayout(): Model {
	const m = empty(), S = m.S;
	box3(S, -6, 6, 0, 4, -4, 4); rectY(S, -6, 6, -4, 4, 4.6);
	for (const x of [-6, 6]) for (const z of [-4, 4]) L(S, [x, 4, z], [x, 4.6, z]);
	poly(S, [[-4, 0, 4], [-4, 2.4, 4], [-2.6, 2.4, 4], [-2.6, 0, 4]]);
	rectY(S, 1, 4, 4, 4, 1.2);
	const y = 3.4;
	for (const x of [-3, 3]) for (const z of [-2, 2]) { m.outlets.push({ p: [x, 4, z], d: 0.3, h: 0.06 }); m.pipes.push({ pts: [[x, 4, z], [x, y, z]], d: 0.056 }); }
	for (const z of [-2, 2]) m.pipes.push({ pts: [[-3, y, z], [5.4, y, z]], d: 0.075, label: z < 0 });
	m.pipes.push({ pts: [[5.4, y, -2], [5.4, y, 2]], d: 0.09 });
	m.pipes.push({ pts: [[5.4, y, 0], [5.4, 0.3, 0], [7.5, -0.6, 0]], d: 0.09, label: true });
	m.dims.push({ a: [-6, 0, 4], b: [6, 0, 4], off: [0, 0, 1.6] });
	m.dims.push({ a: [6, 0, -4], b: [6, 0, 4], off: [2.6, 0, 0] });
	m.dims.push({ a: [-6, 0, -4], b: [-6, 4, -4], off: [-1.4, 0, 0] });
	return m;
}

const BUILDERS: Record<string, () => Model> = {
	harbor, drain, tower, pipes: pipesRun, library, layout: outletLayout,
};

const cache = new Map<string, ModelInfo>();

/** Builds a project's model once and measures it; R (half the bounding-box diagonal) drives the opening view and flying speed. */
export function getModel(projectId: string): ModelInfo {
	const hit = cache.get(projectId);
	if (hit) return hit;
	const m = (BUILDERS[projectId] ?? harbor)();
	const lo: V3 = [Infinity, Infinity, Infinity], hi: V3 = [-Infinity, -Infinity, -Infinity];
	const add = (p: V3) => { for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); } };
	m.S.forEach(([a, b]) => { add(a); add(b); });
	m.pipes.forEach((p) => p.pts.forEach(add));
	m.outlets.forEach((o) => add(o.p));
	const size: V3 = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
	const info: ModelInfo = {
		...m, lo, size,
		center: [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2],
		R: Math.max(0.3, Math.hypot(size[0], size[1], size[2]) / 2),
	};
	cache.set(projectId, info);
	return info;
}

export const fmtLen = (l: number) => (l < 1 ? `${Math.round(l * 1000)} mm` : `${l.toFixed(l < 10 ? 2 : 1)} m`);
export function niceStep(x: number) {
	const p = Math.pow(10, Math.floor(Math.log10(x))), f = x / p;
	return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
}

export type Preview = { structure: Seg[]; pipes: Seg[]; floorY: number };
const previewCache = new Map<string, Preview>();

/**
 * The project's real model, centred and scaled to fit a unit sphere, for the list previews.
 * Structure stays as lines; pipe runs become their centre lines; outlets become small rings.
 */
export function getPreview(projectId: string): Preview {
	const hit = previewCache.get(projectId);
	if (hit) return hit;
	const m = getModel(projectId);
	const n = (p: V3): V3 => [(p[0] - m.center[0]) / m.R, (p[1] - m.center[1]) / m.R, (p[2] - m.center[2]) / m.R];
	const structure: Seg[] = m.S.map(([a, b]) => [n(a), n(b)]);
	const pipes: Seg[] = [];
	for (const p of m.pipes) for (let i = 0; i < p.pts.length - 1; i++) pipes.push([n(p.pts[i]), n(p.pts[i + 1])]);
	for (const o of m.outlets) {
		const r = o.d / 2, steps = 12;
		for (let i = 0; i < steps; i++) {
			const a0 = (i / steps) * Math.PI * 2, a1 = ((i + 1) / steps) * Math.PI * 2;
			pipes.push([
				n([o.p[0] + Math.cos(a0) * r, o.p[1] + o.h, o.p[2] + Math.sin(a0) * r]),
				n([o.p[0] + Math.cos(a1) * r, o.p[1] + o.h, o.p[2] + Math.sin(a1) * r]),
			]);
		}
	}
	const preview = { structure, pipes, floorY: (m.lo[1] - m.center[1]) / m.R };
	previewCache.set(projectId, preview);
	return preview;
}
