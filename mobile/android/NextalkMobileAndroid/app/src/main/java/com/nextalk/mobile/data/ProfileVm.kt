package com.nextalk.mobile.data

import android.content.ContentResolver
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.appcheck.FirebaseAppCheck
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream

data class Profile(
  val uid: String? = null,
  val displayName: String? = null,
  val bio: String? = null,
  val photoUrl: String? = null,
  val videoUrl: String? = null
)

data class ProfileState(
  val uid: String? = null,
  val loading: Boolean = true,
  val error: String? = null,
  val profile: Profile? = null
)

class ProfileVm : ViewModel() {
  private val auth = FirebaseAuth.getInstance()
  private val appCheck = FirebaseAppCheck.getInstance()
  private val db = FirebaseFirestore.getInstance()
  private val http = OkHttpClient()

  private val _state = MutableStateFlow(ProfileState())
  val state = _state.asStateFlow()

  private var unsubscribe: (() -> Unit)? = null

  init {
    val current = auth.currentUser
    if (current != null) listenProfile(current.uid)
    else _state.value = _state.value.copy(loading = false, uid = null)
  }

  fun onAuthChanged() {
    val current = auth.currentUser
    if (current != null) listenProfile(current.uid)
    else {
      unsubscribe?.invoke()
      unsubscribe = null
      _state.value = ProfileState(uid = null, loading = false, error = null, profile = null)
    }
  }

  private fun listenProfile(uid: String) {
    unsubscribe?.invoke()
    _state.value = _state.value.copy(uid = uid, loading = true, error = null)

    val reg = db.collection("profiles").document(uid).addSnapshotListener { snap, err ->
      if (err != null) {
        _state.value = _state.value.copy(loading = false, error = err.message)
        return@addSnapshotListener
      }
      val p = if (snap != null && snap.exists()) {
        Profile(
          uid = uid,
          displayName = snap.getString("displayName"),
          bio = snap.getString("bio"),
          photoUrl = snap.getString("photoUrl"),
          videoUrl = snap.getString("videoUrl")
        )
      } else {
        Profile(uid = uid)
      }
      _state.value = _state.value.copy(loading = false, error = null, profile = p)
    }
    unsubscribe = { reg.remove() }
  }

  fun save(displayName: String, bio: String) {
    val uid = state.value.uid ?: return
    _state.value = _state.value.copy(loading = true, error = null)
    db.collection("profiles").document(uid)
      .set(
        mapOf(
          "uid" to uid,
          "displayName" to displayName.trim(),
          "bio" to bio.trim()
        ),
        com.google.firebase.firestore.SetOptions.merge()
      )
      .addOnSuccessListener { _state.value = _state.value.copy(loading = false) }
      .addOnFailureListener { e ->
        _state.value = _state.value.copy(loading = false, error = e.message ?: "Save error")
      }
  }

  fun upload(uri: Uri, isVideo: Boolean, contentResolver: ContentResolver) {
    val uid = state.value.uid ?: return
    viewModelScope.launch {
      try {
        _state.value = _state.value.copy(loading = true, error = null)
        val user = auth.currentUser ?: throw IllegalStateException("Non connecté")
        val idToken = user.getIdToken(false).await().token ?: throw IllegalStateException("ID token manquant")
        val appCheckToken = appCheck.getAppCheckToken(false).await().token

        val tmp = copyToTempFile(uri, contentResolver, isVideo)
        val mime = if (isVideo) "video/mp4" else "image/jpeg"

        val body = MultipartBody.Builder()
          .setType(MultipartBody.FORM)
          .addFormDataPart("uid", uid) // ignoré côté serveur (uid vient du token), gardé pour debug
          .addFormDataPart(
            "file",
            tmp.name,
            tmp.asRequestBody(mime.toMediaTypeOrNull())
          )
          .build()

        val req = Request.Builder()
          .url("${BuildConfig.BACKEND_BASE_URL}/api/upload")
          .addHeader("Authorization", "Bearer $idToken")
          .addHeader("X-Firebase-AppCheck", appCheckToken)
          .post(body)
          .build()

        http.newCall(req).execute().use { resp ->
          val txt = resp.body?.string() ?: ""
          if (!resp.isSuccessful) throw IllegalStateException("Upload failed: ${resp.code} $txt")
          val json = JSONObject(txt)
          val url = json.getString("url")
          val field = if (isVideo) "videoUrl" else "photoUrl"
          db.collection("profiles").document(uid)
            .set(mapOf(field to url), com.google.firebase.firestore.SetOptions.merge())
            .addOnFailureListener { e ->
              _state.value = _state.value.copy(error = e.message ?: "Firestore update error")
            }
        }
        _state.value = _state.value.copy(loading = false)
      } catch (e: Exception) {
        _state.value = _state.value.copy(loading = false, error = e.message ?: "Upload error")
      }
    }
  }

  private fun copyToTempFile(uri: Uri, cr: ContentResolver, isVideo: Boolean): File {
    val ext = if (isVideo) ".mp4" else ".jpg"
    val file = File.createTempFile("upload-", ext)
    cr.openInputStream(uri).use { input ->
      requireNotNull(input) { "Cannot open input stream" }
      FileOutputStream(file).use { out -> input.copyTo(out) }
    }
    return file
  }

  override fun onCleared() {
    unsubscribe?.invoke()
    super.onCleared()
  }
}

