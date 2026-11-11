import { useLocalSearchParams } from 'expo-router';
import CameraScreen from '../screens/camera-screen';

export default function CameraRoute() {
	const { photoUri, photoWidth, photoHeight } = useLocalSearchParams<{
		photoUri?: string; photoWidth?: string; photoHeight?: string;
	}>();
	const width = Number(photoWidth);
	const height = Number(photoHeight);
	const photo = typeof photoUri === 'string' && photoUri && Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0
		? { uri: photoUri, width, height }
		: undefined;
	return <CameraScreen key={photo?.uri ?? 'camera'} initialPhoto={photo} />;
}
