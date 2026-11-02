package com.crickettechnology.trees

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

// A round button styled like the Google Maps compass button: white, with a soft shadow.
@Composable
fun InfoButton(action: () -> Unit) {
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
            painter = painterResource(R.drawable.info),
            contentDescription = "About",
            tint = SwiftUIColor.white035
        )
    }
}

@Preview
@Composable
private fun InfoButtonPreview() {
    Box(Modifier.background(Color.Gray).padding(16.dp)) {
        InfoButton {}
    }
}
