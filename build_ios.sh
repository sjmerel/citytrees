#!/bin/bash
set -e

cd "$(dirname "$0")/ios"
xcrun agvtool bump
xcodebuild -project trees.xcodeproj -scheme trees-prod -destination 'generic/platform=iOS' archive
