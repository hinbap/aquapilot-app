import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ExportIcon } from 'phosphor-react-native';
import BackButton from '../components/back-button';
import ProjectThumb from '../components/project-thumb';
import ShareSheet from '../components/share-sheet';
import { PROJECTS, projectName, type Project } from '../lib/data';
import { useApp, useStyles } from '../lib/settings';
import type { Tokens } from '../lib/theme';

export default function ProjectsScreen() {
	const { t, s, settings } = useApp();
	const styles = useStyles(createStyles);
	const [sharing, setSharing] = useState<Project | null>(null);

	const open = (p: Project) => router.push({ pathname: '/viewer/[id]', params: { id: p.id } });

	return (
		<SafeAreaView style={styles.root} edges={['top']}>
			<FlatList
				data={PROJECTS}
				keyExtractor={(p) => p.id}
				contentContainerStyle={styles.list}
				ListHeaderComponent={
					<View>
						<BackButton onPress={() => router.back()} />
						<View style={styles.titleRow}>
							<Text style={styles.title}>{s.projectsTitle}</Text>
							<Text style={styles.count}>{s.fileCount(PROJECTS.length)}</Text>
						</View>
					</View>
				}
				ItemSeparatorComponent={() => <View style={styles.separator} />}
				renderItem={({ item, index }) => {
					const name = projectName(item, settings.lang);
					return (
						<View style={styles.item}>
							<Pressable onPress={() => open(item)} accessibilityRole="button" accessibilityLabel={`${s.open} ${name}`} style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
								<ProjectThumb projectId={item.id} phase={index} />
								<Text style={styles.tileIndex}>{String(index + 1).padStart(2, '0')}</Text>
							</Pressable>
							<View style={styles.meta}>
								<Pressable onPress={() => open(item)} style={styles.metaText} accessibilityRole="button">
									<Text style={styles.name}>{name}</Text>
									<Text style={styles.date}>{item.date}</Text>
								</Pressable>
								<Pressable
									onPress={() => setSharing(item)}
									accessibilityRole="button"
									accessibilityLabel={s.shareProject}
									style={({ pressed }) => [styles.shareBtn, pressed && styles.shareBtnPressed]}
								>
									<ExportIcon size={20} color={t.muted} />
								</Pressable>
							</View>
						</View>
					);
				}}
			/>
			<ShareSheet visible={!!sharing} projectName={sharing ? projectName(sharing, settings.lang) : ''} onClose={() => setSharing(null)} />
		</SafeAreaView>
	);
}

const createStyles = (t: Tokens) =>
	StyleSheet.create({
		root: { flex: 1, backgroundColor: t.bg },
		list: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 48 },
		titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 20, marginBottom: 24, marginLeft: 4 },
		title: { fontFamily: t.body, fontSize: 28, fontWeight: '500', letterSpacing: -0.3, color: t.text },
		count: { fontFamily: t.mono, fontSize: 12, color: t.ink, marginRight: 4 },
		separator: { height: 24 },
		item: { gap: 12 },
		tile: { width: '100%', aspectRatio: 16 / 10, borderRadius: 14, overflow: 'hidden', backgroundColor: t.tileBg, borderWidth: 1, borderColor: t.border },
		pressed: { opacity: 0.85 },
		tileIndex: { position: 'absolute', top: 10, left: 10, fontFamily: t.monoLatin, fontSize: 10, letterSpacing: 1, color: t.ink, opacity: 0.8 },
		meta: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 2 },
		metaText: { flex: 1, gap: 4 },
		name: { fontFamily: t.body, fontSize: 15, fontWeight: '500', lineHeight: 19, color: t.text },
		date: { fontFamily: t.monoLatin, fontSize: 11, letterSpacing: 0.4, color: t.muted },
		shareBtn: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
		shareBtnPressed: { backgroundColor: t.accentSoft },
	});
