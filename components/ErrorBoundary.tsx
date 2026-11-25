import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { fonts, radius, useTheme } from '../lib/theme';
import { Button, Card, T, hair } from './ui';

interface Props {
	children: ReactNode;
	/** Short label logged to Sentry (e.g. "lesson:csc-101:l1" or "block:diagram") */
	context?: string;
	/** Compact inline fallback for a single lesson block so the rest of the lesson stays readable */
	compact?: boolean;
	/** Optional reset callback (e.g. retry or navigate back) */
	onReset?: () => void;
}

interface State {
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	state: State = { error: null };

	static getDerivedStateFromError(error: Error): State {
		return { error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		Sentry.captureException(error, {
			tags: this.props.context ? { boundary: this.props.context } : undefined,
			extra: {
				context: this.props.context,
				componentStack: info.componentStack
			}
		});
	}

	reset = () => {
		this.setState({ error: null });
		this.props.onReset?.();
	};

	render() {
		if (!this.state.error) return this.props.children;
		return <Fallback compact={this.props.compact} onReset={this.reset} />;
	}
}

function Fallback({ compact, onReset }: { compact?: boolean; onReset: () => void }) {
	const t = useTheme();
	if (compact) {
		return (
			<View
				style={{
					backgroundColor: t.surface,
					borderRadius: radius.md,
					borderWidth: hair,
					borderColor: t.line2,
					padding: 14,
					gap: 6
				}}
			>
				<Text style={{ fontFamily: fonts.bodySemi, fontSize: 13.5, color: t.fg2 }}>
					This section couldn’t be displayed.
				</Text>
				<Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.muted }}>
					We’ve logged the issue so we can fix it.
				</Text>
			</View>
		);
	}
	return (
		<View style={{ flex: 1, backgroundColor: t.bg, justifyContent: 'center', padding: 20 }}>
			<Card tint={t.danger} tintStrength={12} style={{ gap: 10 }}>
				<T v="bodyStrong" color={t.fg}>
					Something went wrong opening this screen.
				</T>
				<T v="small">We’ve sent a crash report automatically so we can fix it right away.</T>
				<Button small kind="solid" title="Try again" onPress={onReset} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
			</Card>
		</View>
	);
}
