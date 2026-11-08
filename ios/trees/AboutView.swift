import SwiftUI
import WebKit

// The about page, shown modally. Content is read from about.html in the app bundle.
struct AboutView: View {

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        HTMLView(resource: "about")
            .ignoresSafeArea(.container, edges: .bottom)
            .overlay(alignment: .topTrailing) {
                Button(action: { dismiss() }) {
                    Image("x")
                        .renderingMode(.template)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 48, height: 48)
                        .foregroundColor(Color(red: 29 / 255, green: 73 / 255, blue: 64 / 255))
                        .padding(8)
                }
                .accessibilityLabel("Close")
                .offset(x: 4, y: -4)
            }
    }
}

struct HTMLView: UIViewRepresentable {

    let resource: String

    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView()
        webView.isOpaque = false
        webView.backgroundColor = UIColor(AppColors.background)
        webView.scrollView.backgroundColor = webView.backgroundColor
        webView.navigationDelegate = context.coordinator
        webView.scrollView.pinchGestureRecognizer?.isEnabled = false
        webView.scrollView.alwaysBounceHorizontal = false
        if let url = Bundle.main.url(forResource: resource, withExtension: "html"),
           var html = try? String(contentsOf: url, encoding: .utf8) {
            let data = try! Data(contentsOf: Dataset.instance.localDir.appendingPathComponent("cities.json"))
            let cities = try! JSONDecoder().decode([City].self, from: data)
            html = html.replacingOccurrences(of: "[TREE_COUNT]", with: TileDb.instance.siteCount.formatted())
                .replacingOccurrences(of: "[CITY_COUNT]", with: cities.count.formatted())
                .replacingOccurrences(of: "[CITIES]", with: Self.citiesHTML(cities))
                .replacingOccurrences(of: "width=device-width, initial-scale=1",
                                      with: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no")
                .replacingOccurrences(of: "</head>",
                                      with: "<style>html, body { overflow-x: hidden; }</style></head>")
            // read access to the bundle lets the page load its stylesheet
            webView.loadHTMLString(html, baseURL: url.deletingLastPathComponent())
        }
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    private struct City: Decodable {
        let name: String
        let state: String?
        let country: String
        let sites: Int
        let license: License?

        private enum CodingKeys: String, CodingKey {
            case name, state, country, sites, license
        }

        init(from decoder: Decoder) throws {
            let values = try decoder.container(keyedBy: CodingKeys.self)
            name = try values.decode(String.self, forKey: .name)
            state = try values.decodeIfPresent(String.self, forKey: .state)
            country = try values.decode(String.self, forKey: .country)
            sites = try values.decode(Int.self, forKey: .sites)
            // Older downloaded datasets store only a license URL, not attribution metadata.
            if (try? values.decode(String.self, forKey: .license)) != nil {
                license = nil
            }
            else {
                license = try values.decodeIfPresent(License.self, forKey: .license)
            }
        }
    }

    private struct License: Decodable {
        let api_url: String?
        let portal_url: String?
        let dataset_name: String?
        let attribution_name: String?
        let license: String?
        let license_name: String?
        let terms_url: String?
        let notices: [String]?
        let attribution_url: String?
        let last_updated: String?
    }

    // The cities in cities.json (downloaded with the data set), as an HTML list per country.
    // Empty until the first data set has been downloaded.
    private static func citiesHTML(_ cities: [City]) -> String {
        let sections = Dictionary(grouping: cities, by: { $0.country })
            .map { code, cities in (title: Locale.current.localizedString(forRegionCode: code)!, cities: cities) }
            .sorted { $0.title.localizedStandardCompare($1.title) == .orderedAscending }
        return sections.map { title, cities in
            let items = cities
                .map { city in (name: city.state.map { "\(city.name), \($0)" } ?? city.name, sites: city.sites, license: city.license) }
                .sorted { $0.name.localizedStandardCompare($1.name) == .orderedAscending }
                .map { name, sites, license in
                    "<li style=\"list-style: none\"><details><summary style=\"font-size: inherit; font-weight: normal\">\(name.htmlEscaped) <span class=\"tree-count\">(\(sites.formatted()) trees)</span></summary>\(licenseHTML(license))</details></li>"
                }
            return "<h3>\(title.htmlEscaped)</h3><ul>\(items.joined())</ul>"
        }.joined() + "<p class=\"license-statement\">All datasets listed above are modified by City Trees: records filtered, botanical names standardized, and data converted to map tiles.</p>"
    }

    private static func licenseHTML(_ license: License?) -> String {
        if let license {
            var paragraphs = [String]()
            let source = license.portal_url ?? license.api_url!

            var row = "Data: "
            if let datasetName = license.dataset_name {
                row += linkHTML(datasetName, url: source)
            }
            else {
                row += linkHTML("Dataset source", url: source)
            }
            if let attrName = license.attribution_name {
                row += ", by \(attrName.htmlEscaped)"
            }
            paragraphs.append(row)

            if let name = license.license_name, let url = license.license {
                let label = name.hasPrefix("CC0 ") ? "Public-domain dedication" : "Licensed under"
                paragraphs.append("\(label) \(linkHTML(name, url: url)).")
            }

            for notice in license.notices ?? [] {
                paragraphs.append(notice.htmlEscaped)
            }
            if let lastUpdated = license.last_updated {
                paragraphs.append("Last updated \(lastUpdated).");
            }

            if let url = license.attribution_url {
                paragraphs.append(linkHTML("Attribution source", url: url))
            }
            if let url = license.terms_url, url != source, url != license.license {
                paragraphs.append(linkHTML("Source terms and notices", url: url))
            }
            return paragraphs.map { "<p class=\"license-statement\">\($0)</p>" }.joined()
        }
        return "<p class=\"license-statement\">License information is not available in this downloaded dataset.</p>"
    }

    private static func linkHTML(_ title: String, url: String?) -> String {
        if let url {
            let scheme = URL(string: url)?.scheme?.lowercased()
            if scheme == "https" || scheme == "http" {
                return "<a href=\"\(url.htmlEscaped)\">\(title.htmlEscaped)</a>"
            }
        }
        return title.htmlEscaped
    }

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    class Coordinator: NSObject, WKNavigationDelegate {
        // links (web and mailto) open outside the app
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if navigationAction.navigationType == .linkActivated, let url = navigationAction.request.url {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
            }
            else {
                decisionHandler(.allow)
            }
        }
    }
}

private extension String {
    var htmlEscaped: String {
        replacingOccurrences(of: "&", with: "&amp;").replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: "\"", with: "&quot;")
    }
}

#Preview {
    AboutView()
}
