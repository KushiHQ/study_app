// Full-screen focus mode, opened from a lesson or Today.
import { useRouter } from 'expo-router';
import { FocusView } from '../components/FocusView';

export default function FocusModal() {
	const router = useRouter();
	return <FocusView onClose={() => router.back()} />;
}
