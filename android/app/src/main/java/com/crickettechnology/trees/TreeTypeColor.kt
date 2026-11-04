package com.crickettechnology.trees

import android.graphics.Color

// Swift: TreeType+Color.swift

val TreeType.color: Int
    get() { return TreeType.palette[colorIndex % TreeType.palette.size] }

// colors for various genera
val TreeType.Companion.palette: List<Int>
    get() { return treeTypePalette }

private val treeTypePalette: List<Int> = listOf(
    Color.rgb(255, 126, 87),
    Color.rgb(229, 0, 0),
    Color.rgb(255, 155, 0),
    Color.rgb(202, 47, 0),
    Color.rgb(200, 189, 0),
    Color.rgb(135, 111, 0),
    Color.rgb(91, 214, 88),
    Color.rgb(0, 144, 0),
    Color.rgb(0, 222, 186),
    Color.rgb(0, 154, 114),
    Color.rgb(0, 212, 255),
    Color.rgb(0, 137, 209),
    Color.rgb(60, 187, 255),
    Color.rgb(0, 97, 255),
    Color.rgb(178, 158, 255),
    Color.rgb(113, 45, 255),
    Color.rgb(242, 133, 255),
    Color.rgb(180, 0, 201),
    Color.rgb(255, 119, 180),
    Color.rgb(219, 0, 107),
)
