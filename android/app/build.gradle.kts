import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.crickettechnology.trees"
    compileSdk {
        version = release(37) {
            minorApiLevel = 1
        }
    }

    defaultConfig {
        applicationId = "com.crickettechnology.trees"
        minSdk = 31
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"

        // Add MAPS_API_KEY=... to secrets/android-secrets.properties at the repository root (gitignored).
        val mapsPropertiesFile = rootProject.file("../secrets/android-secrets.properties")
        check(mapsPropertiesFile.isFile) {
            "Create secrets/android-secrets.properties at the repository root with MAPS_API_KEY=your_key."
        }
        val mapsProperties = Properties()
        mapsPropertiesFile.inputStream().use { mapsProperties.load(it) }
        val mapsApiKey = mapsProperties.getProperty("MAPS_API_KEY")?.trim()
        check(!mapsApiKey.isNullOrEmpty()) {
            "Set MAPS_API_KEY in secrets/android-secrets.properties at the repository root."
        }
        manifestPlaceholders["MAPS_API_KEY"] = mapsApiKey

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.core.ktx)
    implementation(libs.play.services.maps)
    implementation(libs.maps.compose)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    testImplementation(libs.junit)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.junit)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
    debugImplementation(libs.androidx.compose.ui.tooling)
}