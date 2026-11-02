import Foundation


class Config {

    static let instance: Config = Config()

    let deployment: String
    let serverUrl: URL


    ////////////////////////////////////////

    private init() {
        // config for deployment type
        let url = Bundle.main.url(forResource: "deployment", withExtension: "json")!
        let data = try! Data(contentsOf: url)
        let deploymentConfig = try! JSONSerialization.jsonObject(with: data) as! [String: Any]
        self.serverUrl = URL(string: deploymentConfig["serverUrlBase"] as! String)!
        self.deployment = deploymentConfig["deployment"] as! String
    }

}


