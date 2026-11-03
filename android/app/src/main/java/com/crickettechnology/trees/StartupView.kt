package com.crickettechnology.trees

import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.layout
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.roundToInt

@Composable
fun StartupView(onClose: () -> Unit) {
    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null,
                onClickLabel = "Tap to dismiss", onClick = onClose)
            .windowInsetsPadding(WindowInsets.safeDrawing.only(WindowInsetsSides.Top + WindowInsetsSides.Horizontal))
    ) {
        val cardWidth = maxWidth - 60.dp
        Box(
            modifier = Modifier
                .layout { measurable, constraints ->
                    val card = measurable.measure(constraints.copy(minHeight = 0))
                    layout(constraints.maxWidth, constraints.maxHeight) {
                        card.placeRelative(0, (constraints.maxHeight * 0.4f - card.height / 2f).roundToInt())
                    }
                }
                .padding(horizontal = 30.dp)
                .fillMaxWidth()
                .shadow(5.dp, RoundedCornerShape(16.dp))
                .clip(RoundedCornerShape(16.dp))
        ) {
            Image(painterResource(R.drawable.icon_wide),
                contentDescription = null,
                modifier = Modifier.matchParentSize(),
                alignment = Alignment.BottomCenter,
                contentScale = ContentScale.Crop)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 30.dp, end = cardWidth * 0.24f + 12.dp, top = 24.dp, bottom = 48.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text("City Trees",
                    fontSize = 26.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1D4940),
                    textAlign = TextAlign.Start)
                Text("Tap on a colored dot on the map to identify a tree!",
                    fontSize = 16.sp,
                    color = Color(0xFF1D4940),
                    textAlign = TextAlign.Start)
            }
        }
    }
}

@Preview
@Composable
private fun StartupViewPreview() {
    StartupView(onClose = {})
}
