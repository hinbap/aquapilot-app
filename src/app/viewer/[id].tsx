import { useLocalSearchParams } from 'expo-router';
import ViewerScreen from '../../screens/viewer-screen';

export default function Viewer() {
	const { id } = useLocalSearchParams<{ id: string }>();
	return <ViewerScreen projectId={String(id)} />;
}
