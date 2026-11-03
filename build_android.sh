#!/bin/bash
set -e

cd "$(dirname "$0")/android"
versionCode=$(cat versionCode.txt)
echo "$((versionCode + 1))" > versionCode.txt
./gradlew bundleProdRelease
