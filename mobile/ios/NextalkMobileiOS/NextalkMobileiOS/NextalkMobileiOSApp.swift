import SwiftUI

@main
struct NextalkMobileiOSApp: App {
  @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
  @StateObject private var store = ProfileStore()

  var body: some Scene {
    WindowGroup {
      ContentView()
        .environmentObject(store)
        .task { await store.ensureSignedInAndListen() }
    }
  }
}

