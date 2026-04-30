import SwiftUI
import PhotosUI

struct ContentView: View {
  @EnvironmentObject var store: ProfileStore

  @State private var email: String = ""
  @State private var password: String = ""
  @State private var phone: String = ""
  @State private var otp: String = ""
  @State private var verificationId: String?

  @State private var displayName: String = ""
  @State private var bio: String = ""

  @State private var pickedItem: PhotosPickerItem?
  @State private var pickedVideoItem: PhotosPickerItem?

  var body: some View {
    NavigationView {
      Form {
        if store.uid == nil {
          Section("Connexion") {
            if store.isLoading { ProgressView() }
            if let err = store.error { Text(err).foregroundColor(.red) }

            TextField("Email", text: $email)
              .textInputAutocapitalization(.never)
              .keyboardType(.emailAddress)
            SecureField("Mot de passe", text: $password)

            HStack {
              Button("Se connecter") { Task { await store.signInEmail(email: email.trimmingCharacters(in: .whitespacesAndNewlines), password: password) } }
              Button("Créer compte") { Task { await store.signUpEmail(email: email.trimmingCharacters(in: .whitespacesAndNewlines), password: password) } }
            }
          }

          Section("Téléphone (OTP)") {
            TextField("+243...", text: $phone)
              .keyboardType(.phonePad)
            Button("Envoyer code") {
              Task {
                do {
                  verificationId = try await store.startPhone(phone: phone.trimmingCharacters(in: .whitespacesAndNewlines))
                } catch {
                  store.error = error.localizedDescription
                }
              }
            }
            if verificationId != nil {
              TextField("Code (6 chiffres)", text: $otp)
                .keyboardType(.numberPad)
              Button("Vérifier") {
                guard let vid = verificationId else { return }
                Task { await store.verifyPhone(verificationID: vid, code: otp.trimmingCharacters(in: .whitespacesAndNewlines)) }
              }
            }
          }
        } else {
          Section("Profil (temps réel)") {
            HStack {
              Text("UID: \(store.uid ?? "...")")
              Spacer()
              Button("Déconnexion") { store.signOut() }
            }
            if store.isLoading { ProgressView() }
            if let err = store.error { Text(err).foregroundColor(.red) }

            TextField("Nom", text: $displayName)
            TextField("Bio", text: $bio, axis: .vertical)
              .lineLimit(3...6)

            Button("Enregistrer") {
              Task { await store.save(displayName: displayName, bio: bio) }
            }
          }

          Section("Upload") {
            PhotosPicker(
              selection: $pickedItem,
              matching: .images,
              photoLibrary: .shared()
            ) { Text("Upload image") }

            PhotosPicker(
              selection: $pickedVideoItem,
              matching: .videos,
              photoLibrary: .shared()
            ) { Text("Upload vidéo") }

            Text("photoUrl: \(store.profile?.photoUrl ?? "-")")
            Text("videoUrl: \(store.profile?.videoUrl ?? "-")")
          }
        }
      }
      .navigationTitle("Solola")
      .onChange(of: store.profile?.displayName) { _, new in
        if let new { displayName = new }
      }
      .onChange(of: store.profile?.bio) { _, new in
        if let new { bio = new }
      }
      .onChange(of: pickedItem) { _, newItem in
        guard let uid = store.uid, let newItem else { return }
        Task {
          do {
            let url = try await exportToTempFile(item: newItem, ext: "jpg")
            let idToken = try await store.getIdToken()
            let appCheckToken = try await store.getAppCheckToken()
            let resp = try await UploadClient.shared.upload(fileUrl: url, uid: uid, kind: .image, idToken: idToken, appCheckToken: appCheckToken)
            await store.setMediaUrl(photoUrl: resp.url)
          } catch {
            store.error = error.localizedDescription
          }
        }
      }
      .onChange(of: pickedVideoItem) { _, newItem in
        guard let uid = store.uid, let newItem else { return }
        Task {
          do {
            let url = try await exportToTempFile(item: newItem, ext: "mp4")
            let idToken = try await store.getIdToken()
            let appCheckToken = try await store.getAppCheckToken()
            let resp = try await UploadClient.shared.upload(fileUrl: url, uid: uid, kind: .video, idToken: idToken, appCheckToken: appCheckToken)
            await store.setMediaUrl(videoUrl: resp.url)
          } catch {
            store.error = error.localizedDescription
          }
        }
      }
    }
  }

  private func exportToTempFile(item: PhotosPickerItem, ext: String) async throws -> URL {
    let data = try await item.loadTransferable(type: Data.self)
    guard let data else { throw NSError(domain: "Picker", code: -1, userInfo: [NSLocalizedDescriptionKey: "Impossible de lire le fichier"]) }
    let url = FileManager.default.temporaryDirectory.appendingPathComponent("upload-\(UUID().uuidString).\(ext)")
    try data.write(to: url)
    return url
  }
}

