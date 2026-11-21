import { View } from 'react-native';
import { alpha } from '../lib/theme';

export function CourseHalo({ color }: { color: string }) {
	return (
		<View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', width: 224, height: 224, top: -132, right: -78, alignItems: 'center', justifyContent: 'center' }}>
			{[224, 184, 144].map((size) => (
				<View key={size} style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: alpha(color, 0.04), borderWidth: 1, borderColor: alpha(color, 0.13) }} />
			))}
		</View>
	);
}
