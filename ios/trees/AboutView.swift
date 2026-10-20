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

    // The cities in cities.json (copied into the app by process.ts), as an HTML list per country.
    private static func citiesHTML() -> String {
        guard let url = Bundle.main.url(forResource: "cities", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let cities = try? JSONDecoder().decode([City].self, from: data) else { return "" }
        let sections = [("US", "United States"), ("CA", "Canada"), ("GB", "United Kingdom"), ("AU", "Australia")]
        return sections.map { code, title in
            let items = cities.filter { $0.country == code }
                .map { city in city.state.map { "\(city.name), \($0)" } ?? city.name }
                .sorted()
                .map { "<li>\($0.htmlEscaped)</li>" }
            if items.isEmpty { return "" }
            return "<h3>\(title)</h3><ul>\(items.joined())</ul>"
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
