// Sample projects and the AquaPilot folder tree. Replace with your API data.
import type { Lang } from './theme';

export type Project = {
	id: string;
	name: string;
	nameKo: string;
	date: string;
};

export const PROJECTS: Project[] = [
	{ id: 'harbor', name: 'Harbor Logistics Center', nameKo: '하버 물류센터', date: '2026.11.04' },
	{ id: 'tower', name: 'Riverside Tower', nameKo: '리버사이드 타워', date: '2026.10.15' },
];

export const projectName = (p: Project, lang: Lang) => (lang === 'ko' ? p.nameKo : p.name);

export type Folder = { id: string; en: string; ko: string; children?: Folder[] };

export const FOLDERS: Folder[] = [
	{
		id: 'clients', en: 'Clients', ko: '고객사', children: [
			{ id: 'harbor', en: 'Harbor Group', ko: '하버 그룹' },
			{ id: 'riverside', en: 'Riverside Development', ko: '리버사이드 개발' },
			{
				id: 'ashford', en: 'City of Ashford', ko: '애쉬포드 시청', children: [
					{ id: 'library', en: 'Civic Library', ko: '시립 도서관' },
					{ id: 'depot', en: 'Bus Depot', ko: '버스 차고지' },
				],
			},
		],
	},
	{
		id: 'roof', en: 'Roof drainage', ko: '지붕 배수', children: [
			{ id: 'siphonic', en: 'Siphonic', ko: '사이폰식' },
			{ id: 'gravity', en: 'Gravity', ko: '중력식' },
		],
	},
	{ id: 'templates', en: 'Templates', ko: '템플릿' },
	{
		id: 'archive', en: 'Archive', ko: '보관함', children: [
			{ id: 'y2025', en: '2025', ko: '2025' },
			{ id: 'y2024', en: '2024', ko: '2024' },
		],
	},
];
