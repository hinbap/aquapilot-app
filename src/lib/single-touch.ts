import type { GestureResponderEvent, NativeTouchEvent, ViewProps } from 'react-native';

type Point = Pick<NativeTouchEvent, 'pageX' | 'pageY' | 'locationX' | 'locationY'>;
type Callbacks = {
	onStart: (point: Point) => void;
	onMove: (point: Point) => void;
	onEnd: () => void;
};

// Raw touch events stay with the view where each finger landed. Unlike two
// PanResponders, sibling controls can therefore run at the same time.
export function createSingleTouchHandlers({ onStart, onMove, onEnd }: Callbacks): ViewProps {
	let active: NativeTouchEvent['identifier'] | null = null;
	const reset = () => {
		if (active === null) return;
		active = null;
		onEnd();
	};
	const start = (event: GestureResponderEvent) => {
		if (active !== null) return;
		const touch = Array.from(event.nativeEvent.changedTouches).find((t) => t.target === event.nativeEvent.target);
		if (!touch) return;
		active = touch.identifier;
		// DOM Touch objects lack locationX/Y; use the control's bounds on web.
		const element = event.currentTarget as unknown as { getBoundingClientRect?: () => { left: number; top: number } };
		const rect = element.getBoundingClientRect?.();
		const webTouch = touch as NativeTouchEvent & { clientX: number; clientY: number };
		onStart({
			pageX: touch.pageX, pageY: touch.pageY,
			locationX: touch.locationX ?? webTouch.clientX - (rect?.left ?? 0),
			locationY: touch.locationY ?? webTouch.clientY - (rect?.top ?? 0),
		});
	};
	const move = (event: GestureResponderEvent) => {
		const touch = Array.from(event.nativeEvent.changedTouches).find((t) => t.identifier === active);
		if (touch) onMove(touch);
	};
	const end = (event: GestureResponderEvent) => {
		if (Array.from(event.nativeEvent.changedTouches).some((t) => t.identifier === active)) reset();
	};
	return {
		onTouchStart: start,
		onTouchMove: move,
		onTouchEnd: end,
		onTouchCancel: end,
		// React Native Web normalizes mouse drags through its responder system.
		// Claim only the mouse, leaving all touchscreen fingers independent.
		onStartShouldSetResponder: (event) => (event.nativeEvent as NativeTouchEvent & { type?: string }).type === 'mousedown',
		onResponderGrant: start,
		onResponderMove: move,
		onResponderRelease: reset,
		onResponderTerminate: reset,
	};
}
