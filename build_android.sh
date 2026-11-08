#!/bin/bash
set -e

cd "$(dirname "$0")/android"

versionCode=$(cat versionCode.txt)
echo "$((versionCode + 1))" > versionCode.txt

./gradlew bundleProdRelease

cp ./app/build/outputs/bundle/prodRelease/app-prod-release.aab ./app/build/
