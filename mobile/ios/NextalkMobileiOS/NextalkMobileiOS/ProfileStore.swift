import Foundation
import FirebaseAuth
import FirebaseFirestore
import FirebaseAppCheck

struct Profile: Codable {
  var uid: String
  var displayName: String?
  var bio: String?
  var photoUrl: String?
  var videoUrl: String?
}

@MainActor
final class ProfileStore: ObservableObject {
  private enum SessionKeys {
    static let firebaseIdToken = "solola.firebase.idtoken"
  }

  @Published var uid: String?
  @Published var profile: Profile?
  @Published var isLoading: Bool = true
  @Published var error: String?

  private let auth = Auth.auth()
  private let appCheck = AppCheck.appCheck()
  private let db = Firestore.firestore()
  private var listener: ListenerRegistration?

  func ensureSignedInAndListen() async {
    isLoading = true
    error = nil

    if let u = auth.currentUser {
      startListening(uid: u.uid)
      return
    }
    isLoading = false
  }

  private func startListening(uid: String) {
    self.uid = uid
    listener?.remove()
    listener = db.collection("profiles").document(uid).addSnapshotListener { [weak self] snap, err in
      guard let self else { return }
      if let err {
        self.isLoading = false
        self.error = err.localizedDescription
        return
      }
      let data = snap?.data() ?? [:]
      self.profile = Profile(
        uid: uid,
        displayName: data["displayName"] as? String,
        bio: data["bio"] as? String,
        photoUrl: data["photoUrl"] as? String,
        videoUrl: data["videoUrl"] as? String
      )
      self.isLoading = false
      self.error = nil
    }
  }

  func save(displayName: String, bio: String) async {
    guard let uid else { return }
    isLoading = true
    error = nil

    do {
      try await db.collection("profiles").document(uid).setData(
        [
          "uid": uid,
          "displayName": displayName.trimmingCharacters(in: .whitespacesAndNewlines),
          "bio": bio.trimmingCharacters(in: .whitespacesAndNewlines)
        ],
        merge: true
      )
      isLoading = false
    } catch {
      isLoading = false
      self.error = error.localizedDescription
    }
  }

  func setMediaUrl(photoUrl: String? = nil, videoUrl: String? = nil) async {
    guard let uid else { return }
    var data: [String: Any] = [:]
    if let photoUrl { data["photoUrl"] = photoUrl }
    if let videoUrl { data["videoUrl"] = videoUrl }
    guard !data.isEmpty else { return }

    do {
      try await db.collection("profiles").document(uid).setData(data, merge: true)
    } catch {
      self.error = error.localizedDescription
    }
  }

  func signOut() {
    do {
      try auth.signOut()
      uid = nil
      profile = nil
      listener?.remove()
      listener = nil
      UserDefaults.standard.removeObject(forKey: SessionKeys.firebaseIdToken)
    } catch {
      self.error = error.localizedDescription
    }
  }

  func signInEmail(email: String, password: String) async {
    isLoading = true
    error = nil
    do {
      let res = try await auth.signIn(withEmail: email, password: password)
      let token = try await res.user.getIDToken()
      UserDefaults.standard.set(token, forKey: SessionKeys.firebaseIdToken)
      startListening(uid: res.user.uid)
    } catch {
      isLoading = false
      self.error = error.localizedDescription
    }
  }

  func signUpEmail(email: String, password: String) async {
    isLoading = true
    error = nil
    do {
      let res = try await auth.createUser(withEmail: email, password: password)
      let token = try await res.user.getIDToken()
      UserDefaults.standard.set(token, forKey: SessionKeys.firebaseIdToken)
      startListening(uid: res.user.uid)
    } catch {
      isLoading = false
      self.error = error.localizedDescription
    }
  }

  func startPhone(phone: String) async throws -> String {
    try await PhoneAuthProvider.provider().verifyPhoneNumber(phone, uiDelegate: nil)
  }

  func verifyPhone(verificationID: String, code: String) async {
    isLoading = true
    error = nil
    do {
      let credential = PhoneAuthProvider.provider().credential(
        withVerificationID: verificationID,
        verificationCode: code
      )
      let res = try await auth.signIn(with: credential)
      let token = try await res.user.getIDToken()
      UserDefaults.standard.set(token, forKey: SessionKeys.firebaseIdToken)
      startListening(uid: res.user.uid)
    } catch {
      isLoading = false
      self.error = error.localizedDescription
    }
  }

  func getIdToken() async throws -> String {
    guard let user = auth.currentUser else { throw NSError(domain: "Auth", code: 401, userInfo: [NSLocalizedDescriptionKey: "Non connecté"]) }
    let token = try await user.getIDToken()
    UserDefaults.standard.set(token, forKey: SessionKeys.firebaseIdToken)
    return token
  }

  func getAppCheckToken() async throws -> String {
    let res = try await appCheck.token(forcingRefresh: false)
    return res.token
  }
}

