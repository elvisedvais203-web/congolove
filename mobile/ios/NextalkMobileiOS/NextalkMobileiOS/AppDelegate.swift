import UIKit
import FirebaseCore
import FirebaseAppCheck

final class AppDelegate: NSObject, UIApplicationDelegate {
  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil
  ) -> Bool {
    // App Check (App Attest / DeviceCheck)
    AppCheck.setAppCheckProviderFactory(AppCheckProviderFactory())
    FirebaseApp.configure()
    return true
  }
}

final class AppCheckProviderFactory: NSObject, AppCheckProviderFactoryProtocol {
  func createProvider(with app: FirebaseApp) -> AppCheckProvider? {
#if DEBUG
    return AppCheckDebugProvider(app: app)
#else
    if #available(iOS 14.0, *) {
      return AppAttestProvider(app: app)
    } else {
      return DeviceCheckProvider(app: app)
    }
#endif
  }
}

