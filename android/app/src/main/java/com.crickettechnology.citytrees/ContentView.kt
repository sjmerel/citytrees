package com.crickettechnology.citytrees

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.colorResource
import androidx.compose.ui.text.style.TextAlign
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
    var showingAbout by rememberSaveable { mutableStateOf(false) }
    var satellite by remember { mutableStateOf(false) }
    var locationEnabled by rememberSaveable { mutableStateOf(TreesApplication.defaults.getBoolean("hasShownAbout", false)) }
    val isLocationAuthorized = remember { mutableStateOf(false) }
    var locationRequest by remember { mutableIntStateOf(0) }
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
            MapView(selectedTypeIndex, tileDownloadFailed, satellite, locationEnabled, isLocationAuthorized, locationRequest).Content()
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
                if (isLocationAuthorized.value) {
                    LocationButton { locationRequest += 1 }
                }
                LayersButton(satellite) { satellite = !satellite }
                InfoButton { showingAbout = true }
            }
        }
        if (showingAbout) {
            val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
            val scope = rememberCoroutineScope()
            LaunchedEffect(sheetState.isVisible) {
                if (sheetState.isVisible) {
                    TreesApplication.defaults.edit().putBoolean("hasShownAbout", true).apply()
                }
            }
            ModalBottomSheet(
                onDismissRequest = {
                    showingAbout = false
                    locationEnabled = true
                },
                sheetState = sheetState,
                containerColor = colorResource(R.color.app_background),
                dragHandle = null
            ) {
                Box(Modifier.fillMaxHeight(0.9f)) {
                    AboutView {
                        scope.launch { sheetState.hide() }.invokeOnCompletion {
                            showingAbout = false
                            locationEnabled = true
                        }
                    }
                }
            }
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
                    Text("Data download failed; some trees may be missing.",
                        fontSize = 13.sp,
                        color = colorResource(R.color.app_text),
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(5.dp, RoundedCornerShape(14.dp))
                            .background(colorResource(R.color.app_background), RoundedCornerShape(14.dp))
                            .padding(horizontal = 16.dp, vertical = 8.dp))
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
                if (!TreesApplication.defaults.getBoolean("hasShownAbout", false)) {
                    showingAbout = true
                }
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
