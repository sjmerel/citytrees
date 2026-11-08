package com.crickettechnology.citytrees

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.MotionEvent
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.colorResource
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.text.Collator
import java.text.NumberFormat
import java.util.Locale

// The about page, shown modally. Content is read from about.html in the app's assets.
@Composable
fun AboutView(dismiss: () -> Unit) {
    Box(Modifier.fillMaxSize()) {
        HTMLView("about")
        Icon(
            painter = painterResource(R.drawable.x),
            contentDescription = null,
            tint = colorResource(R.color.app_text),
            modifier = Modifier
                .align(Alignment.TopEnd)
                .offset(x = 4.dp, y = (-4).dp)
                .semantics { contentDescription = "Close" }
                .clickable(onClick = dismiss)
                .padding(8.dp)
                .size(48.dp)
        )
    }
}

@Composable
fun HTMLView(resource: String) {
    AndroidView(
        factory = { context -> HTMLView.makeUIView(context, resource) },
        modifier = Modifier.fillMaxSize()
    )
}

object HTMLView {

    fun makeUIView(context: Context, resource: String): WebView {
        val webView = object : WebView(context) {
            override fun onTouchEvent(event: MotionEvent): Boolean {
                if (event.actionMasked == MotionEvent.ACTION_DOWN) {
                    // Keep the bottom sheet from intercepting page scroll gestures.
                    parent.requestDisallowInterceptTouchEvent(true)
                }
                return super.onTouchEvent(event)
            }
        }
        webView.setBackgroundColor(context.getColor(R.color.app_background))
        webView.webViewClient = Coordinator()
        var html = context.assets.open("$resource.html").use { String(it.readBytes()) }
        val file = File(Dataset.instance.localDir, "cities.json")
        val json = JSONArray(file.readText())
        val cities = ArrayList<City>()
        for (i in 0 until json.length()) {
            cities.add(City(json.getJSONObject(i)))
        }
        val numberFormat = NumberFormat.getIntegerInstance()
        html = html.replace("[TREE_COUNT]", numberFormat.format(TileDb.instance.siteCount))
            .replace("[CITY_COUNT]", numberFormat.format(cities.size))
            .replace("[CITIES]", citiesHTML(cities))
        // the asset base URL lets the page load its stylesheet
        webView.loadDataWithBaseURL("file:///android_asset/", html, "text/html", "utf-8", null)
        return webView
    }

    private class City(
        val name: String,
        val state: String?,
        val country: String,
        val sites: Int,
        val license: License?
    ) {
        constructor(values: JSONObject) : this(
            values.requiredString("name"),
            values.optionalString("state"),
            values.requiredString("country"),
            values.get("sites") as Int,
            // Older downloaded datasets store only a license URL, not attribution metadata.
            if (values.opt("license") is String || values.isNull("license")) null
            else License(values.getJSONObject("license"))
        )
    }

    private class License(values: JSONObject) {
        val url = values.optionalString("url")
        val api_url = values.optionalString("api_url")
        val portal_url = values.optionalString("portal_url")
        val dataset_name = values.optionalString("dataset_name")
        val attribution_name = values.optionalString("attribution_name")
        val license = values.optionalString("license")
        val license_name = values.optionalString("license_name")
        val terms_url = values.optionalString("terms_url")
        val notices = values.optionalStringArray("notices")
        val attribution_url = values.optionalString("attribution_url")
        val last_updated = values.optionalString("last_updated")
    }

    // The cities in cities.json (downloaded with the data set), as an HTML list per country.
    private fun citiesHTML(cities: List<City>): String {
        val collator = Collator.getInstance()
        val numberFormat = NumberFormat.getIntegerInstance()
        val sections = cities.groupBy { it.country }
            .map { (code, cities) -> Pair(Locale("", code).displayCountry, cities) }
            .sortedWith { a, b -> collator.compare(a.first, b.first) }
        return sections.joinToString("") { (title, cities) ->
            val items = cities
                .map { city -> Triple(if (city.state != null) "${city.name}, ${city.state}" else city.name, city.sites, city.license) }
                .sortedWith { a, b -> collator.compare(a.first, b.first) }
                .map { (name, sites, license) ->
                    "<li style=\"list-style: none\"><details><summary style=\"font-size: inherit; font-weight: normal\">${name.htmlEscaped} <span class=\"tree-count\">(${numberFormat.format(sites)} trees)</span></summary>${licenseHTML(license)}</details></li>"
                }
            "<h3>${title.htmlEscaped}</h3><ul>${items.joinToString("")}</ul>"
        } + "<p class=\"license-statement\">All datasets listed above are modified by City Trees: records filtered, botanical names standardized, and data converted to map tiles.</p>"
    }

    private fun licenseHTML(license: License?): String {
        if (license != null) {
            val paragraphs = ArrayList<String>()
            val source = license.portal_url ?: license.api_url ?: license.url
            var row = "Data: "
            val datasetName = license.dataset_name
            if (datasetName != null) {
                row += linkHTML(datasetName, source)
            }
            else {
                row += linkHTML("Dataset source", source)
            }
            val attrName = license.attribution_name
            if (attrName != null) {
                row += ", by ${attrName.htmlEscaped}"
            }
            paragraphs.add(row)

            val name = license.license_name
            val licenseUrl = license.license
            if (name != null && licenseUrl != null) {
                val label = if (name.startsWith("CC0 ")) "Public-domain dedication" else "Licensed under"
                paragraphs.add("$label ${linkHTML(name, licenseUrl)}.")
            }
            for (notice in license.notices ?: emptyList()) {
                paragraphs.add(notice.htmlEscaped)
            }
            val lastUpdated = license.last_updated
            if (lastUpdated != null) {
                paragraphs.add("Last updated ${lastUpdated.htmlEscaped}.")
            }
            val attributionUrl = license.attribution_url
            if (attributionUrl != null) {
                paragraphs.add(linkHTML("Attribution source", attributionUrl))
            }
            val termsUrl = license.terms_url
            if (termsUrl != null && termsUrl != source && termsUrl != license.license) {
                paragraphs.add(linkHTML("Source terms and notices", termsUrl))
            }
            return paragraphs.joinToString("") { "<p class=\"license-statement\">$it</p>" }
        }
        return "<p class=\"license-statement\">License information is not available in this downloaded dataset.</p>"
    }

    private fun linkHTML(title: String, url: String?): String {
        if (url != null) {
            val scheme = Uri.parse(url).scheme?.lowercase()
            if (scheme == "https" || scheme == "http") {
                return "<a href=\"${url.htmlEscaped}\">${title.htmlEscaped}</a>"
            }
        }
        return title.htmlEscaped
    }

    private class Coordinator : WebViewClient() {
        // links (web and mailto) open outside the app
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            if (request.hasGesture()) {
                try {
                    view.context.startActivity(Intent(Intent.ACTION_VIEW, request.url))
                }
                catch (e: ActivityNotFoundException) {
                    println("can't open ${request.url}: $e")
                }
                return true
            }
            else {
                return false
            }
        }
    }

    private val String.htmlEscaped: String
        get() { return replace("&", "&amp;").replace("<", "&lt;").replace("\"", "&quot;") }

    private fun JSONObject.requiredString(key: String): String {
        return get(key) as String
    }

    private fun JSONObject.optionalString(key: String): String? {
        return if (isNull(key)) null else requiredString(key)
    }

    private fun JSONObject.optionalStringArray(key: String): List<String>? {
        if (isNull(key)) {
            return null
        }
        val values = getJSONArray(key)
        return List(values.length()) { values.get(it) as String }
    }
}
