import SwiftUI
import WebKit

// The about page, shown modally. Content is read from about.html in the app bundle.
struct AboutView: View {

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        HTMLView(resource: "about")
            .overlay(alignment: .topTrailing) {
                Button(action: { dismiss() }) {
                    Image(systemName: "xmark")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.gray)
                        .padding(8)
                }
                .accessibilityLabel("Close")
                .padding(8)
            }
    }
}

struct HTMLView: UIViewRepresentable {

    let resource: String

    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView()
        webView.navigationDelegate = context.coordinator
        if let url = Bundle.main.url(forResource: resource, withExtension: "html"),
           var html = try? String(contentsOf: url, encoding: .utf8) {
            html = html.replacingOccurrences(of: "[CITIES]", with: Self.citiesHTML())
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
    }

    // The cities in cities.json (downloaded with the data set), as an HTML list per country.
    // Empty until the first data set has been downloaded.
    private static func citiesHTML() -> String {
        let url = Dataset.instance.localDir.appendingPathComponent("cities.json")
        let data = try! Data(contentsOf: url)
        let cities = try! JSONDecoder().decode([City].self, from: data)
        let sections = Dictionary(grouping: cities, by: { $0.country })
            .map { code, cities in (title: Locale.current.localizedString(forRegionCode: code)!, cities: cities) }
            .sorted { $0.title.localizedStandardCompare($1.title) == .orderedAscending }
        return sections.map { title, cities in
            let items = cities
                .map { city in city.state.map { "\(city.name), \($0)" } ?? city.name }
                .sorted { $0.localizedStandardCompare($1) == .orderedAscending }
                .map { "<li>\($0.htmlEscaped)</li>" }
            return "<h3>\(title.htmlEscaped)</h3><ul>\(items.joined())</ul>"
        }.joined()
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
    }
}

#Preview {
    AboutView()
}
