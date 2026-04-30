plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.android")
  id("com.google.gms.google-services")
}

android {
  namespace = "com.nextalk.mobile"
  compileSdk = 35

  defaultConfig {
    applicationId = "com.nextalk.mobile"
    minSdk = 24
    targetSdk = 35
    versionCode = 1
    versionName = "1.0"

    buildConfigField("String", "BACKEND_BASE_URL", "\"http://10.0.2.2:4100\"")
  }

  buildFeatures {
    compose = true
    buildConfig = true
  }

  composeOptions {
    kotlinCompilerExtensionVersion = "1.5.15"
  }

  packaging {
    resources {
      excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }
  kotlinOptions {
    jvmTarget = "17"
  }
}

dependencies {
  implementation(platform("com.google.firebase:firebase-bom:34.0.0"))
  implementation("com.google.firebase:firebase-auth")
  implementation("com.google.firebase:firebase-firestore")
  implementation("com.google.firebase:firebase-appcheck-playintegrity")
  debugImplementation("com.google.firebase:firebase-appcheck-debug")

  implementation("androidx.activity:activity-compose:1.9.2")
  implementation("androidx.compose.ui:ui:1.7.2")
  implementation("androidx.compose.ui:ui-tooling-preview:1.7.2")
  implementation("androidx.compose.material3:material3:1.3.0")
  implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.6")
  implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.6")

  implementation("com.squareup.okhttp3:okhttp:4.12.0")
  implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.9.0")

  debugImplementation("androidx.compose.ui:ui-tooling:1.7.2")
}

