import { NativeModule, requireOptionalNativeModule } from 'expo';
import type { PhotoReceipt } from './OpencvBridge.types';

declare class OpencvBridgeModule extends NativeModule {
	receivePhoto(uri: string, width: number, height: number): Promise<PhotoReceipt>;
}

// Keep the screen usable in older development builds; report a missing bridge on confirmation.
export default requireOptionalNativeModule<OpencvBridgeModule>('OpencvBridge');
