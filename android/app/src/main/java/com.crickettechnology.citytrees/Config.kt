package com.crickettechnology.citytrees

import org.json.JSONObject
import java.net.URL


class Config private constructor() {

    companion object {
        val instance: Config = Config()
    }

    val deployment: String
    val serverUrl: URL


    ////////////////////////////////////////

    init {
        // config for deployment type
        val stream = Config::class.java.classLoader!!.getResourceAsStream("deployment.json")!!
        val data = stream.use { it.readBytes() }
        val deploymentConfig = JSONObject(String(data))
        this.serverUrl = URL(deploymentConfig.getString("serverUrlBase"))
        this.deployment = deploymentConfig.getString("deployment")
    }

}
