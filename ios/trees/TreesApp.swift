import SwiftUI
//import FirebaseAnalytics

@main struct TreesApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .onAppear {
                    
                    /*
                    // Test custom event
                    Analytics.logEvent("test_app_launch", parameters: [
                        "platform": "ios",
                        "debug_session": true
                    ])
                     */
                    
                }
        }
    }
}
