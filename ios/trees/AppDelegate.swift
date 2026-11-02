import FirebaseCore
import GoogleMaps

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        FirebaseApp.configure()
        guard let mapsApiKey = Bundle.main.object(forInfoDictionaryKey: "MAPS_API_KEY") as? String,
              !mapsApiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              !mapsApiKey.contains("$(") else {
            fatalError("Set MAPS_API_KEY in secrets/ios-secrets.xcconfig at the repository root.")
        }
        GMSServices.provideAPIKey(mapsApiKey)

        return true
    }
}
