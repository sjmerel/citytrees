package com.crickettechnology.citytrees

import android.app.Application
import android.content.Context
import android.content.SharedPreferences

// Android-specific: makes the application context available to singletons such as Dataset,
// which on iOS use FileManager and UserDefaults directly.
class TreesApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        context = this
    }

    companion object {
        lateinit var context: Context
            private set

        // counterpart of UserDefaults.standard
        val defaults: SharedPreferences
            get() { return context.getSharedPreferences("defaults", Context.MODE_PRIVATE) }
    }
}
