import type { ExpoWebGLRenderingContext } from 'expo-gl';
import { WebGLRenderer } from 'three';

export function createGLRenderer(gl: ExpoWebGLRenderingContext): WebGLRenderer {
	// Older Expo native builds make WebGL2RenderingContext inherit from WebGLRenderingContext.
	// Check the actual WebGL 2 identity before using the canvas acquisition path below.
	if (typeof WebGL2RenderingContext === 'undefined' || !(gl instanceof WebGL2RenderingContext)) {
		throw new Error('The 3D viewer requires WebGL 2 / OpenGL ES 3.0 support.');
	}

	const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
	let canvas = gl.canvas;
	if (!canvas) {
		// Native GLView has no DOM canvas. Preserve the existing context and its size.
		canvas = {
			width: w, height: h, clientWidth: w, clientHeight: h, style: {},
			addEventListener: () => { }, removeEventListener: () => { },
			getContext: (kind: string) => kind === 'webgl2' ? gl : null,
		} as unknown as HTMLCanvasElement;

		// Expo implements flip-Y and unpack alignment; other pixel-store flags log warnings.
		const pixelStorei = gl.pixelStorei.bind(gl);
		gl.pixelStorei = (pname: number, param: number | boolean) => {
			if (pname === gl.UNPACK_FLIP_Y_WEBGL || pname === gl.UNPACK_ALIGNMENT) {
				pixelStorei(pname, param as number);
			}
		};
	}

	// Passing `context` directly triggers Three's WebGL 1 instanceof guard on older Expo
	// builds, even for WebGL 2. Ask the canvas for the verified context instead.
	const renderer = new WebGLRenderer({
		canvas,
		alpha: gl.getContextAttributes()?.alpha ?? false,
		antialias: true,
	});
	try {
		renderer.setPixelRatio(1);
		renderer.setSize(w, h, false);
		return renderer;
	} catch (error) {
		renderer.dispose();
		throw error;
	}
}
