package com.nextalk.mobile

import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.google.firebase.FirebaseException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.PhoneAuthCredential
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import com.nextalk.mobile.data.ProfileVm
import com.nextalk.mobile.ui.theme.AppTheme
import java.util.concurrent.TimeUnit

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContent {
      AppTheme {
        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
          val vm: ProfileVm = viewModel()
          val state by vm.state.collectAsState()

          val auth = remember { FirebaseAuth.getInstance() }
          var email by remember { mutableStateOf("") }
          var password by remember { mutableStateOf("") }
          var phone by remember { mutableStateOf("") }
          var otp by remember { mutableStateOf("") }
          var verificationId by remember { mutableStateOf<String?>(null) }

          var displayName by remember { mutableStateOf("") }
          var bio by remember { mutableStateOf("") }

          val pickImage = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.PickVisualMedia()
          ) { uri: Uri? ->
            if (uri != null) vm.upload(uri, isVideo = false, contentResolver = contentResolver)
          }

          val pickVideo = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.GetContent()
          ) { uri: Uri? ->
            if (uri != null) vm.upload(uri, isVideo = true, contentResolver = contentResolver)
          }

          LaunchedEffect(state.profile) {
            val p = state.profile
            if (p != null) {
              displayName = p.displayName ?: ""
              bio = p.bio ?: ""
            }
          }

          if (state.uid == null) {
            Column(
              modifier = Modifier.fillMaxSize().padding(16.dp),
              verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
              Text(text = "Connexion", style = MaterialTheme.typography.headlineSmall)
              state.error?.let { Text(text = it, color = MaterialTheme.colorScheme.error) }

              Text(text = "Email / Mot de passe", style = MaterialTheme.typography.titleMedium)
              OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth())
              OutlinedTextField(value = password, onValueChange = { password = it }, label = { Text("Mot de passe") }, modifier = Modifier.fillMaxWidth())
              Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Button(onClick = {
                  auth.signInWithEmailAndPassword(email.trim(), password)
                    .addOnSuccessListener { vm.onAuthChanged() }
                    .addOnFailureListener { e -> vm.onAuthChanged(); }
                }) { Text("Se connecter") }
                Button(onClick = {
                  auth.createUserWithEmailAndPassword(email.trim(), password)
                    .addOnSuccessListener { vm.onAuthChanged() }
                    .addOnFailureListener { e -> vm.onAuthChanged(); }
                }) { Text("Créer compte") }
              }

              Text(text = "Téléphone (OTP)", style = MaterialTheme.typography.titleMedium)
              OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("+243...") }, modifier = Modifier.fillMaxWidth())
              Button(onClick = {
                val callbacks = object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
                  override fun onVerificationCompleted(credential: PhoneAuthCredential) {
                    auth.signInWithCredential(credential)
                      .addOnSuccessListener { vm.onAuthChanged() }
                      .addOnFailureListener { vm.onAuthChanged() }
                  }
                  override fun onVerificationFailed(e: FirebaseException) {
                    vm.onAuthChanged()
                  }
                  override fun onCodeSent(vid: String, token: PhoneAuthProvider.ForceResendingToken) {
                    verificationId = vid
                  }
                }
                val options = PhoneAuthOptions.newBuilder(auth)
                  .setPhoneNumber(phone.trim())
                  .setTimeout(60L, TimeUnit.SECONDS)
                  .setActivity(this@MainActivity)
                  .setCallbacks(callbacks)
                  .build()
                PhoneAuthProvider.verifyPhoneNumber(options)
              }, enabled = phone.trim().startsWith("+")) { Text("Envoyer code") }

              if (verificationId != null) {
                OutlinedTextField(value = otp, onValueChange = { otp = it }, label = { Text("Code (6 chiffres)") }, modifier = Modifier.fillMaxWidth())
                Button(onClick = {
                  val vid = verificationId ?: return@Button
                  val credential = PhoneAuthProvider.getCredential(vid, otp.trim())
                  auth.signInWithCredential(credential)
                    .addOnSuccessListener { vm.onAuthChanged() }
                    .addOnFailureListener { vm.onAuthChanged() }
                }) { Text("Vérifier") }
              }
            }
          } else {
            Column(
              modifier = Modifier.fillMaxSize().padding(16.dp),
              verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
              Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(text = "Profil (temps réel)", style = MaterialTheme.typography.headlineSmall)
                TextButton(onClick = {
                  auth.signOut()
                  vm.onAuthChanged()
                }) { Text("Déconnexion") }
              }
              Text(text = "UID: ${state.uid}")

              if (state.loading) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                  CircularProgressIndicator()
                }
              }

              state.error?.let { Text(text = it, color = MaterialTheme.colorScheme.error) }

              OutlinedTextField(
                value = displayName,
                onValueChange = { displayName = it },
                label = { Text("Nom") },
                modifier = Modifier.fillMaxWidth()
              )
              OutlinedTextField(
                value = bio,
                onValueChange = { bio = it },
                label = { Text("Bio") },
                modifier = Modifier.fillMaxWidth()
              )

              Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
              ) {
                Button(onClick = { vm.save(displayName, bio) }) {
                  Text("Enregistrer")
                }
                Button(onClick = {
                  pickImage.launch(
                    ActivityResultContracts.PickVisualMedia.Request.Builder()
                      .setMediaType(ActivityResultContracts.PickVisualMedia.ImageOnly)
                      .build()
                  )
                }) { Text("Upload image") }
                Button(onClick = { pickVideo.launch("video/*") }) {
                  Text("Upload vidéo")
                }
              }

              Text(text = "photoUrl: ${state.profile?.photoUrl ?: "-"}")
              Text(text = "videoUrl: ${state.profile?.videoUrl ?: "-"}")
            }
          }
        }
      }
    }
  }
}

