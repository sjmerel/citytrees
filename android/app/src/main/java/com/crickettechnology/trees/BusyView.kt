package com.crickettechnology.trees

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// A modal overlay: dims the screen and blocks touches. Shows a spinner, or, if retry is given,
// the text with a Retry button (for errors).
@Composable
fun BusyView(text: String? = null, retry: (() -> Unit)? = null) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.3f))
            // blocks touches to the views below
            .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) {},
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .background(Color.Black, RoundedCornerShape(14.dp))
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            if (retry == null) {
                // the size of a large UIActivityIndicatorView
                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(37.dp))
            }
            if (text != null) {
                Text(text,
                    fontSize = 14.sp,
                    color = Color.White,
                    textAlign = TextAlign.Center)
            }
            if (retry != null) {
                // like SwiftUI's bordered button style, tinted white
                Text("Retry",
                    fontSize = 17.sp,
                    color = Color.White,
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(Color.White.copy(alpha = 0.15f))
                        .clickable(onClick = retry)
                        .padding(horizontal = 12.dp, vertical = 7.dp))
            }
        }
    }
}

@Preview
@Composable
private fun BusyViewPreview() {
    BusyView(text = "Finding your location")
}

@Preview(name = "No text")
@Composable
private fun BusyViewNoTextPreview() {
    BusyView()
}

@Preview(name = "Error")
@Composable
private fun BusyViewErrorPreview() {
    BusyView(text = "Couldn't download tree data", retry = {})
}
