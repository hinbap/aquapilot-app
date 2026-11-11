import assert from 'node:assert/strict';
import test from 'node:test';
import { WebGLRenderer } from 'three';
import { createGLRenderer } from '../src/lib/gl-renderer.ts';

// Stop at the first GPU call. These tests exercise the real Three.js constructor's
// context selection without pretending to verify rendering on a native GPU.
const reachedGPU = new Error('Reached GPU initialization');
class Context {
	drawingBufferWidth = 800;
	drawingBufferHeight = 400;
	UNPACK_FLIP_Y_WEBGL = 37440;
	UNPACK_ALIGNMENT = 3317;
	pixelStores = [];
	getContextAttributes() { return { alpha: true }; }
	getExtension() { throw reachedGPU; }
	pixelStorei(...args) { this.pixelStores.push(args); }
}

function installConstructors(t, WebGL1, WebGL2) {
	for (const [name, value] of Object.entries({ WebGLRenderingContext: WebGL1, WebGL2RenderingContext: WebGL2 })) {
		const previous = Object.getOwnPropertyDescriptor(globalThis, name);
		Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
		t.after(() => {
			if (previous) Object.defineProperty(globalThis, name, previous);
			else delete globalThis[name];
		});
	}
	t.mock.method(console, 'error', () => {});
}

test('legacy Expo WebGL 2 inheritance reaches Three GPU initialization', (t) => {
	class WebGL1 extends Context {}
	class WebGL2 extends WebGL1 {}
	installConstructors(t, WebGL1, WebGL2);
	const gl = new WebGL2();
	const canvas = {};
	// Reproduce the reported error with the previous direct-context approach.
	assert.throws(() => new WebGLRenderer({ canvas, context: gl }), /WebGL 1 is not supported/);
	assert.throws(() => createGLRenderer(gl), (error) => error === reachedGPU);
	assert.equal(Object.getPrototypeOf(WebGL2.prototype), WebGL1.prototype);
	assert.ok(gl instanceof WebGL1);
	assert.ok(gl instanceof WebGL2);
	gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.pixelStorei(37441, false);
	assert.deepEqual(gl.pixelStores, [[3317, 1], [37440, true]]);
});

test('current Expo WebGL 2 contexts still reach GPU initialization', (t) => {
	class WebGL1 extends Context {}
	class WebGL2 extends Context {}
	installConstructors(t, WebGL1, WebGL2);
	assert.throws(() => createGLRenderer(new WebGL2()), (error) => error === reachedGPU);
});

test('browser contexts retain their real canvas and pixel-store implementation', (t) => {
	class WebGL1 extends Context {}
	class WebGL2 extends Context {}
	installConstructors(t, WebGL1, WebGL2);
	const gl = new WebGL2();
	const pixelStorei = gl.pixelStorei;
	const requests = [];
	gl.canvas = {
		width: 800, height: 400,
		addEventListener() {}, removeEventListener() {},
		getContext(kind) { requests.push(kind); return gl; },
	};
	assert.throws(() => createGLRenderer(gl), (error) => error === reachedGPU);
	assert.deepEqual(requests, ['webgl2']);
	assert.equal(gl.pixelStorei, pixelStorei);
});

test('a true WebGL 1 context is rejected before any GPU calls', (t) => {
	class WebGL1 extends Context {}
	class WebGL2 extends WebGL1 {}
	installConstructors(t, WebGL1, WebGL2);
	assert.throws(() => createGLRenderer(new WebGL1()), /requires WebGL 2/);
});

test('a missing WebGL 2 runtime reports a supported-context error', (t) => {
	installConstructors(t, Context, undefined);
	assert.throws(() => createGLRenderer(new Context()), /requires WebGL 2/);
});
