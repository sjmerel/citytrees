package com.crickettechnology.trees

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun SelectionCard(type: TreeType, onClose: () -> Unit) {

    val uriHandler = LocalUriHandler.current

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(5.dp, RoundedCornerShape(10.dp))
            .background(Color.White, RoundedCornerShape(10.dp))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 18.dp, vertical = 15.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            Caption("Botanical name")
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(18.dp)
                        .background(Color(type.color), CircleShape)
                        .border(1.dp, Color.Black.copy(alpha = 0.4f), CircleShape)
                )
                Spacer(Modifier.width(6.dp))
                Text(type.canonicalName,
                    fontSize = 18.sp,
                    fontStyle = FontStyle.Italic,
                    color = Color.Black)
                Spacer(Modifier.width(8.dp).weight(1f))
                val url = type.wikipediaUrl
                if (url != null) {
                    Spacer(Modifier.width(6.dp))
                    Image(
                        painter = painterResource(R.drawable.wikipedia),
                        contentDescription = "Open Wikipedia article",
                        modifier = Modifier
                            .size(28.dp)
                            .clip(RoundedCornerShape(6.dp))
                            .background(Color.White)
                            .border(1.dp, Color.Black, RoundedCornerShape(6.dp))
                            .clickable { uriHandler.openUri(url) }
                            .padding(3.dp)
                    )
                }
            }
            if (type.commonNames.isNotEmpty()) {
                Caption("Common names", Modifier.padding(top = 12.dp))
                Text(type.commonNames.joinToString(", "),
                    fontSize = 18.sp,
                    color = Color.Black)
            }
        }
        Icon(
            painter = painterResource(R.drawable.x),
            contentDescription = null,
            tint = SwiftUIColor.gray,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .semantics { contentDescription = "Clear selection" }
                .clickable(onClick = onClose)
                .padding(8.dp)
        )
    }
}

@Composable
private fun Caption(text: String, modifier: Modifier = Modifier) {
    Text(text,
        fontSize = 12.sp,
        color = SwiftUIColor.gray,
        modifier = modifier)
}

@Preview
@Composable
private fun SelectionCardPreview() {
    Box(Modifier.padding(16.dp)) {
        SelectionCard(
            type = TreeType("Platanus × acerifolia",
                            listOf("London plane", "Hybrid plane", "blah blah", "boo boo"),
                            "https://en.wikipedia.org/wiki/London_plane",
                            3),
            onClose = {})
    }
}
