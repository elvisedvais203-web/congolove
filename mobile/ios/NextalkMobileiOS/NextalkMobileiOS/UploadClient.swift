import Foundation
import UniformTypeIdentifiers

enum UploadKind {
  case image
  case video
}

struct UploadResponse: Decodable {
  let uid: String
  let kind: String
  let mime: String
  let path: String
  let url: String
  let expiresAt: Double
}

final class UploadClient {
  static let shared = UploadClient()
  private init() {}

  func upload(fileUrl: URL, uid: String, kind: UploadKind, idToken: String, appCheckToken: String) async throws -> UploadResponse {
    let endpoint = URL(string: "\(Config.BACKEND_BASE_URL)/api/upload")!

    var req = URLRequest(url: endpoint)
    req.httpMethod = "POST"
    req.setValue("Bearer \(idToken)", forHTTPHeaderField: "Authorization")
    req.setValue(appCheckToken, forHTTPHeaderField: "X-Firebase-AppCheck")

    let boundary = "Boundary-\(UUID().uuidString)"
    req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

    let mime: String = {
      switch kind {
      case .image: return "image/jpeg"
      case .video: return "video/mp4"
      }
    }()

    var body = Data()
    func append(_ s: String) { body.append(Data(s.utf8)) }

    append("--\(boundary)\r\n")
    append("Content-Disposition: form-data; name=\"uid\"\r\n\r\n")
    append("\(uid)\r\n")

    let filename = fileUrl.lastPathComponent.isEmpty ? "upload" : fileUrl.lastPathComponent
    let fileData = try Data(contentsOf: fileUrl)

    append("--\(boundary)\r\n")
    append("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n")
    append("Content-Type: \(mime)\r\n\r\n")
    body.append(fileData)
    append("\r\n")
    append("--\(boundary)--\r\n")

    req.httpBody = body

    let (data, resp) = try await URLSession.shared.data(for: req)
    let http = resp as? HTTPURLResponse
    if (http?.statusCode ?? 0) < 200 || (http?.statusCode ?? 0) >= 300 {
      let msg = String(data: data, encoding: .utf8) ?? "Upload error"
      throw NSError(domain: "Upload", code: http?.statusCode ?? -1, userInfo: [NSLocalizedDescriptionKey: msg])
    }

    return try JSONDecoder().decode(UploadResponse.self, from: data)
  }
}

