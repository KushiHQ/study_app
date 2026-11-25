// Reusable 2D vector Ollie Lottie player (idle, lesson, unit, course) with safe web fallback.
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import LottieView from 'lottie-react-native';

export type OllieVariant = 'idle' | 'lesson' | 'unit' | 'course';

const SOURCES: Record<OllieVariant, ReturnType<typeof require>> = {
	idle: require('../assets/ollie/lottie/ollie-idle.json'),
	lesson: require('../assets/ollie/lottie/ollie-lesson.json'),
	unit: require('../assets/ollie/lottie/ollie-unit.json'),
	course: require('../assets/ollie/lottie/ollie-course.json')
};

export function OllieLottie({
	variant,
	size = 180,
	loop = true,
	autoPlay = true,
	style
}: {
	variant: OllieVariant;
	size?: number;
	loop?: boolean;
	autoPlay?: boolean;
	style?: StyleProp<ViewStyle>;
}) {
	if (Platform.OS === 'web') {
		return (
			<View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
				<Image
					source={require('../assets/ollie/ollie-celebrate.png')}
					style={{ width: size * 0.85, height: size * 0.85 }}
					contentFit="contain"
					accessible={false}
				/>
			</View>
		);
	}

	return (
		<LottieView
			key={variant}
			source={SOURCES[variant]}
			autoPlay={autoPlay}
			loop={loop}
			style={[{ width: size, height: size }, style]}
			resizeMode="contain"
		/>
	);
}
