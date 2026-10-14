import FirebaseCore
import GoogleMaps

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        FirebaseApp.configure()
        GMSServices.provideAPIKey("REDACTED_GOOGLE_API_KEY")
        return true
    }
}


