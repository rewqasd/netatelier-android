#!/usr/bin/env bash
set -euo pipefail
case "${1:---help}" in
  --help) echo 'Usage: bash scripts/android-env.sh build|check|test'; exit 0 ;;
  build|check|test) action="$1" ;;
  *) echo 'Unknown action. Use build, check or test.' >&2; exit 2 ;;
esac

# Explicit environment values take precedence. Never change the user's shell profile.
if [ -z "${JAVA_HOME:-}" ]; then
  if [ -x /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home/bin/java ]; then
    export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
  elif [ -x /usr/libexec/java_home ]; then
    export JAVA_HOME="$(/usr/libexec/java_home -v 21 2>/dev/null || true)"
  fi
fi
if [ ! -x "${JAVA_HOME:-}/bin/java" ]; then
  echo 'Set JAVA_HOME to a JDK 21 installation.' >&2; exit 1
fi
java_version="$("$JAVA_HOME/bin/java" -version 2>&1)"
if [[ ! "$java_version" =~ version\ \"21\. ]]; then
  echo 'JAVA_HOME must select JDK 21 for this pinned Gradle build.' >&2; exit 1
fi

if [ -z "${ANDROID_HOME:-}" ]; then
  if [ -n "${ANDROID_SDK_ROOT:-}" ]; then
    export ANDROID_HOME="$ANDROID_SDK_ROOT"
  elif [ -d /opt/homebrew/share/android-commandlinetools/platforms ]; then
    export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
  elif [ -d "$HOME/Library/Android/sdk/platforms" ]; then
    export ANDROID_HOME="$HOME/Library/Android/sdk"
  elif [ -d "$HOME/Android/Sdk/platforms" ]; then
    export ANDROID_HOME="$HOME/Android/Sdk"
  fi
fi
if [ ! -f "${ANDROID_HOME:-}/platforms/android-36/android.jar" ]; then
  echo 'Set ANDROID_HOME to an Android SDK containing platforms;android-36.' >&2; exit 1
fi
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_dir/android"
case "$action" in
  check) java -version; ./gradlew --version ;;
  build) ./gradlew --no-daemon assembleDebug ;;
  test) ./gradlew --no-daemon :app:testDebugUnitTest :app:connectedDebugAndroidTest ;;
esac
