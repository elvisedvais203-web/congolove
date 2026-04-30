package com.nextalk.mobile.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.core.os.ConfigurationCompat

private val DarkColors = darkColorScheme()
private val LightColors = lightColorScheme()

@Composable
fun AppTheme(content: @Composable () -> Unit) {
  val ctx = LocalContext.current
  val scheme = remember { mutableStateOf(LightColors) }

  LaunchedEffect(Unit) {
    val locale = ConfigurationCompat.getLocales(ctx.resources.configuration)[0]
    // Placeholder: keep deterministic theme; can be improved later
    scheme.value = if (locale != null) LightColors else LightColors
  }

  MaterialTheme(
    colorScheme = scheme.value,
    content = content
  )
}

