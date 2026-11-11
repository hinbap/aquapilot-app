import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { ArrowLeftIcon } from 'phosphor-react-native';
import { useApp, useStyles } from '../lib/settings';
import type { Tokens } from '../lib/theme';

export default function BackButton({ onPress }: { onPress: () => void }) {
	const { t, s } = useApp();
	const styles = useStyles(createStyles);
	return (
		<Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={s.back} hitSlop={8} style={({ pressed }) => [styles.root, pressed && styles.pressed]}>
			<ArrowLeftIcon size={14} color={t.muted} />
			<Text style={styles.label}>{t.upper ? s.back.toUpperCase() : s.back}</Text>
		</Pressable>
	);
}

const createStyles = (t: Tokens) =>
	StyleSheet.create({
		root: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 4 },
		pressed: { opacity: 0.6 },
		label: { fontFamily: t.mono, fontSize: 12, letterSpacing: t.labelSpacing, color: t.muted },
	});
