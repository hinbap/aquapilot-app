import { registerWebModule, NativeModule } from 'expo';
import type { PhotoReceipt } from './OpencvBridge.types';

class OpencvBridgeModule extends NativeModule {
	async receivePhoto(_uri: string, _width: number, _height: number): Promise<PhotoReceipt> {
		throw new Error('The C++ photo receiver is only available on iOS and Android.');
	}
}

export default registerWebModule(OpencvBridgeModule, 'OpencvBridge');
