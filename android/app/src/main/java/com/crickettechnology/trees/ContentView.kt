package com.crickettechnology.trees

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContentView() {

    val selectedTypeIndex: MutableState<Int?> = remember { mutableStateOf(null) }
    val isBusy = remember { mutableStateOf(false) }
    var showingAbout by remember { mutableStateOf(false) }
    var satellite by remember { mutableStateOf(false) }
    val tileDownloadFailed = remember { mutableStateOf(false) }
    var checkForNewDataCompleted by remember { mutableStateOf(false) }
    var isCheckingForNewData by remember { mutableStateOf(true) }
    var dataCheckError by remember { mutableStateOf<String?>(null) }
    var dataCheckAttempt by remember { mutableIntStateOf(0) }

    // Android-specific: the last selection, shown while the selection card fades out
    var lastSelectedTypeIndex by remember { mutableStateOf<Int?>(null) }
    val selected = selectedTypeIndex.value
    if (selected != null) {
        lastSelectedTypeIndex = selected
    }

    // the map extends under the system bars too; the overlays stay below the top one
    Box(Modifier.fillMaxSize()) {
        if (checkForNewDataCompleted) {
            MapView(selectedTypeIndex, isBusy, tileDownloadFailed, satellite).Content()
        }
        Box(Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.safeDrawing.only(WindowInsetsSides.Top + WindowInsetsSides.Horizontal))
        ) {
            Column(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(end = 16.dp, bottom = 80.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                LayersButton(satellite) { satellite = !satellite }
                InfoButton { showingAbout = true }
            }
        }
        if (showingAbout) {
            val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
            val scope = rememberCoroutineScope()
            ModalBottomSheet(
                onDismissRequest = { showingAbout = false },
                sheetState = sheetState,
                containerColor = Color.White,
                dragHandle = null
            ) {
                AboutView {
                    scope.launch { sheetState.hide() }.invokeOnCompletion { showingAbout = false }
                }
            }
        }
        AnimatedVisibility(isBusy.value, enter = fadeIn(tween(300)), exit = fadeOut(tween(300))) {
            BusyView(text = "Finding your location")
        }
        Box(Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.safeDrawing.only(WindowInsetsSides.Top + WindowInsetsSides.Horizontal))
        ) {
            AnimatedVisibility(selected != null,
                modifier = Modifier.align(Alignment.TopCenter),
                enter = fadeIn(tween(300)), exit = fadeOut(tween(300))
            ) {
                val type = TreeType.all[lastSelectedTypeIndex!!]
                Box(Modifier.padding(12.dp)) {
                    SelectionCard(type) {
                        selectedTypeIndex.value = null
                    }
                }
            }
            AnimatedVisibility(tileDownloadFailed.value,
                modifier = Modifier.align(Alignment.BottomCenter),
                enter = fadeIn(tween(300)), exit = fadeOut(tween(300))
            ) {
                Box(Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(5.dp, RoundedCornerShape(14.dp))
                            .background(Color.Black, RoundedCornerShape(14.dp))
                            .padding(start = 16.dp, top = 8.dp, bottom = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Data download failed; some trees may be missing.",
                            fontSize = 13.sp,
                            color = Color.White,
                            modifier = Modifier.weight(1f))
                        Spacer(Modifier.width(8.dp))
                        Icon(
                            painter = painterResource(R.drawable.x),
                            contentDescription = null,
                            tint = SwiftUIColor.gray,
                            modifier = Modifier
                                .semantics { contentDescription = "Close" }
                                .clickable { tileDownloadFailed.value = false }
                                .padding(12.dp)
                        )
                    }
                }
            }
        }
        AnimatedVisibility(isCheckingForNewData, enter = fadeIn(tween(300)), exit = fadeOut(tween(300))) {
            BusyView(text = "Checking for new data")
        }
        val error = dataCheckError
        AnimatedVisibility(!isCheckingForNewData && error != null, enter = fadeIn(tween(300)), exit = fadeOut(tween(300))) {
            BusyView(text = error, retry = {
                dataCheckError = null
                isCheckingForNewData = true
                dataCheckAttempt += 1
            })
        }
    }

    LaunchedEffect(dataCheckAttempt) {
        if (!checkForNewDataCompleted) {
            try {
                Dataset.instance.checkForNewData()
                // Android-specific: loading takes long enough that it must be off the main thread
                withContext(Dispatchers.IO) {
                    TreeType.load(File(Dataset.instance.localDir, "types.bin"))
                }
                checkForNewDataCompleted = true
                isCheckingForNewData = false
            }
            catch (e: CancellationException) {
                throw e
            }
            catch (e: Exception) {
                println("checking for new data failed: $e")
                dataCheckError = e.message ?: e.toString()
                isCheckingForNewData = false
            }
        }
    }
}
