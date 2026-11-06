package com.crickettechnology.citytrees

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

@Composable
fun LocationButton(action: () -> Unit) {
    Box(
        modifier = Modifier
            .size(40.dp)
            .shadow(2.dp, CircleShape)
            .background(Color.White, CircleShape)
            .clip(CircleShape)
            .clickable(onClick = action),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            painter = painterResource(R.drawable.crosshair),
            contentDescription = "Show my location",
            tint = SwiftUIColor.white035,
            modifier = Modifier.size(24.dp)
        )
    }
}

@Preview
@Composable
private fun LocationButtonPreview() {
    Box(Modifier.background(Color.Gray).padding(16.dp)) {
        LocationButton {}
    }
}
