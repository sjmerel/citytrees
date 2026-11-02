package com.crickettechnology.trees

import android.graphics.Color

// Swift: TreeType+Color.swift

val TreeType.color: Int
    get() { return TreeType.palette[colorIndex % TreeType.palette.size] }

// colors for various genera
val TreeType.Companion.palette: List<Int>
    get() { return treeTypePalette }

private val treeTypePalette: List<Int> = run {
    // 12 hues, plus darkened and lightened versions, are used for the most common genera
    val colors = listOf(
    Color.rgb(0.90f, 0.10f, 0.10f),  // red
    Color.rgb(1.00f, 0.55f, 0.00f),  // orange
    Color.rgb(0.12f, 0.35f, 1.00f),  // blue
    Color.rgb(0.90f, 0.00f, 0.80f),  // magenta
    Color.rgb(0.00f, 0.78f, 0.90f),  // cyan
    Color.rgb(0.50f, 0.15f, 0.85f),  // purple
    Color.rgb(0.10f, 0.75f, 0.20f),  // green
    Color.rgb(1.00f, 0.20f, 0.47f),  // rose
    Color.rgb(0.00f, 0.58f, 0.50f),  // teal
    Color.rgb(0.63f, 0.31f, 0.08f),  // brown
    Color.rgb(0.60f, 0.86f, 0.00f),  // lime
    Color.rgb(0.90f, 0.70f, 0.00f),  // gold
    )
    val darker = listOf(
        Color.rgb(92, 2, 2),      // red
        Color.rgb(102, 56, 0),    // orange
        Color.rgb(3, 31, 102),    // blue
        Color.rgb(92, 0, 82),     // magenta
        Color.rgb(0, 80, 102),    // cyan
        Color.rgb(47, 8, 102),    // purple
        Color.rgb(3, 77, 15),     // green
        Color.rgb(102, 12, 42),   // rose
        Color.rgb(0, 61, 48),     // teal
        Color.rgb(66, 30, 3),     // brown
        Color.rgb(63, 92, 0),     // lime
        Color.rgb(92, 71, 0),     // gold
    )
    val lighter = listOf(
        Color.rgb(247, 177, 177), // red
        Color.rgb(255, 217, 166), // orange
        Color.rgb(184, 200, 255), // blue
        Color.rgb(247, 177, 239), // magenta
        Color.rgb(166, 239, 247), // cyan
        Color.rgb(208, 177, 240), // purple
        Color.rgb(166, 233, 172), // green
        Color.rgb(255, 179, 202), // rose
        Color.rgb(166, 219, 211), // teal
        Color.rgb(216, 179, 154), // brown
        Color.rgb(217, 240, 166), // lime
        Color.rgb(247, 227, 166), // gold
    )

    val palette = colors + darker + lighter
    palette
}
