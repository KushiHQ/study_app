#!/usr/bin/env bash
# Installs the APK, opens Kushi Study, walks the signed-out screens with adb
# taps and records screenshots + logcat. Crashes go to <out>/crashes.txt.
set -u
APK="$1"; OUT="$2"; PKG=ng.kushi.study
mkdir -p "$OUT"
adb wait-for-device
adb install -r "$APK" || { echo "install failed" > "$OUT/crashes.txt"; exit 0; }
adb logcat -c
shot() { sleep "${2:-3}"; adb exec-out screencap -p > "$OUT/$1.png"; }
adb shell monkey -p $PKG -c android.intent.category.LAUNCHER 1 >/dev/null
shot 01-launch 12
shot 02-welcome 6
# "Continue with email" sits near the bottom of the welcome screen.
adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1 && adb pull /sdcard/ui.xml "$OUT/welcome-ui.xml" >/dev/null 2>&1
BOUNDS=$(grep -o 'text="Continue with email"[^>]*bounds="[^"]*"' "$OUT/welcome-ui.xml" 2>/dev/null | grep -o 'bounds="[^"]*"' | head -1)
if [ -z "$BOUNDS" ]; then BOUNDS=$(grep -o 'content-desc="Continue with email"[^>]*bounds="[^"]*"' "$OUT/welcome-ui.xml" 2>/dev/null | grep -o 'bounds="[^"]*"' | head -1); fi
if [ -n "$BOUNDS" ]; then
	read -r X1 Y1 X2 Y2 <<<"$(echo "$BOUNDS" | tr -c '0-9' ' ')"
	adb shell input tap $(( (X1 + X2) / 2 )) $(( (Y1 + Y2) / 2 ))
	shot 03-email 4
	adb shell input text "smoke@example.com"
	shot 04-email-typed 2
	adb shell input keyevent KEYCODE_BACK
	adb shell input keyevent KEYCODE_BACK
	shot 05-back 3
else
	echo "Continue with email not found on screen" | tee "$OUT/notes.txt"
fi
adb shell input keyevent KEYCODE_HOME
sleep 2
adb shell monkey -p $PKG -c android.intent.category.LAUNCHER 1 >/dev/null
shot 06-resume 5
adb logcat -d > "$OUT/logcat.txt"
grep -E "FATAL EXCEPTION|AndroidRuntime: Process: $PKG|ReactNativeJS.*(Error|Invariant)|E ReactNativeJS" "$OUT/logcat.txt" > "$OUT/crashes.txt" || true
pidof_out=$(adb shell pidof $PKG || true)
[ -z "$pidof_out" ] && echo "app process not running at the end" >> "$OUT/crashes.txt"
echo "crash lines: $(wc -l < "$OUT/crashes.txt")"
exit 0
