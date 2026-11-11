import { launchImageLibraryAsync } from 'expo-image-picker';

export type Photo = { uri: string; width: number; height: number };

export async function choosePhoto(): Promise<Photo | null> {
	// The system photo picker grants access to the selected image without requesting
	// access to the user's entire library.
	const result = await launchImageLibraryAsync({
		mediaTypes: ['images'],
		allowsMultipleSelection: false,
		allowsEditing: false,
		quality: 1,
	});
	return result.canceled ? null : result.assets[0] ?? null;
}
