import { registerWebModule, NativeModule } from 'expo';

// OpencvBridgeModule is not available on the web platform.
class OpencvBridgeModule extends NativeModule {}

export default registerWebModule(OpencvBridgeModule, 'OpencvBridgeModule');
