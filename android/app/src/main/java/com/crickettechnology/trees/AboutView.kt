package com.crickettechnology.trees

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.view.MotionEvent
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import org.json.JSONArray
import java.io.File
import java.text.Collator
import java.util.Locale

// The about page, shown modally. Content is read from about.html in the app's assets.
@Composable
fun AboutView(dismiss: () -> Unit) {
    Box(Modifier.fillMaxSize()) {
        HTMLView("about")
        Icon(
            painter = painterResource(R.drawable.x),
            contentDescription = null,
            tint = Color.Black,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(8.dp)
                .semantics { contentDescription = "Close" }
                .clickable(onClick = dismiss)
                .padding(8.dp)
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
        webView.webViewClient = Coordinator()
        var html = context.assets.open("$resource.html").use { String(it.readBytes()) }
        html = html.replace("[CITIES]", citiesHTML())
        // the asset base URL lets the page load its stylesheet
        webView.loadDataWithBaseURL("file:///android_asset/", html, "text/html", "utf-8", null)
        return webView
    }

    private class City(
        val name: String,
        val state: String?,
        val country: String
    )

    // The cities in cities.json (downloaded with the data set), as an HTML list per country.
    private fun citiesHTML(): String {
        val file = File(Dataset.instance.localDir, "cities.json")
        val json = JSONArray(file.readText())
        val cities = ArrayList<City>()
        for (i in 0 until json.length()) {
            val city = json.getJSONObject(i)
            val state = if (city.isNull("state")) null else city.getString("state")
            cities.add(City(city.getString("name"), state, city.getString("country")))
        }
        val collator = Collator.getInstance()
        val sections = cities.groupBy { it.country }
            .map { (code, cities) -> Pair(Locale("", code).displayCountry, cities) }
            .sortedWith { a, b -> collator.compare(a.first, b.first) }
        return sections.joinToString("") { (title, cities) ->
            val items = cities
                .map { city -> if (city.state != null) "${city.name}, ${city.state}" else city.name }
                .sortedWith(collator)
                .map { "<li>${it.htmlEscaped}</li>" }
            "<h3>${title.htmlEscaped}</h3><ul>${items.joinToString("")}</ul>"
        }
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
        get() { return replace("&", "&amp;").replace("<", "&lt;") }
}
