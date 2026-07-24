plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "ru.swarka.admin"
    compileSdk = 35

    defaultConfig {
        applicationId = "ru.swarka.admin"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        buildConfigField("String", "ADMIN_URL", "\"https://admin.swarka-i-voditel.ru\"")
        buildConfigField("String", "API_URL", "\"https://api.swarka-i-voditel.ru\"")
        buildConfigField("String", "ADMIN_LOGIN", "\"89647779568\"")
        buildConfigField("String", "ADMIN_PASSWORD", "\"Lungu1985!\"")
    }

    signingConfigs {
        create("release") {
            storeFile = file("../release.keystore")
            storePassword = "swarkaadmin"
            keyAlias = "swarka"
            keyPassword = "swarkaadmin"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            isShrinkResources = false
            signingConfig = signingConfigs.getByName("release")
        }
        debug {
            applicationIdSuffix = ".debug"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        buildConfig = true
        viewBinding = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.2.0")
    implementation("androidx.biometric:biometric:1.1.0")
    implementation("androidx.security:security-crypto:1.1.0-alpha06")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
}
