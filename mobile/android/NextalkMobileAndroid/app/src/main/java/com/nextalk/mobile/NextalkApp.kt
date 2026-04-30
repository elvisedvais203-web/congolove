package com.nextalk.mobile

import android.app.Application
import com.google.firebase.FirebaseApp
import com.google.firebase.appcheck.FirebaseAppCheck
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory
import com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory

class NextalkApp : Application() {
  override fun onCreate() {
    super.onCreate()
    FirebaseApp.initializeApp(this)

    val appCheck = FirebaseAppCheck.getInstance()
    // Play Integrity (prod) + Debug provider (debug builds)
    appCheck.installAppCheckProviderFactory(
      if (BuildConfig.DEBUG) DebugAppCheckProviderFactory.getInstance()
      else PlayIntegrityAppCheckProviderFactory.getInstance()
    )
  }
}

