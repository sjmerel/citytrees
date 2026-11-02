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
    }

    // deployment.json, read by Config, is generated for each flavor (see set*Deployment below)
    flavorDimensions += "deployment"
    productFlavors {
        create("local") {
            dimension = "deployment"
            // the local server is plain http
            manifestPlaceholders["usesCleartextTraffic"] = true
        }
        create("prod") {
            dimension = "deployment"
            manifestPlaceholders["usesCleartextTraffic"] = false
        }
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
    debugImplementation(libs.androidx.compose.ui.tooling)
}



// Runs set_deployment.sh to generate the Android deployment.json for the variant's deployment flavor.
androidComponents {
    onVariants { variant ->
        val deployment = variant.productFlavors.first { it.first == "deployment" }.second
        val name = variant.name.replaceFirstChar { it.uppercase() }
        val task = tasks.register<Exec>("set${name}Deployment") {
            commandLine(rootProject.file("../set_deployment.sh").path, deployment, "android")
            // always run, since another variant may have overwritten the file
            outputs.upToDateWhen { false }
        }
        afterEvaluate {
            tasks.named("pre${name}Build") { dependsOn(task) }
        }
    }
}
