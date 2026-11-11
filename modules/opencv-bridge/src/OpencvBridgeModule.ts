import { NativeModule, requireNativeModule } from 'expo';

declare class OpencvBridgeModule extends NativeModule {}

export default requireNativeModule<OpencvBridgeModule>('OpencvBridge');
