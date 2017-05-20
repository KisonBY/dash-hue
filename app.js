var hue = require("node-hue-api");
var dashButton = require("node-dash-button");
var fs = require("fs");
var async = require("async");

var settings = JSON.parse(fs.readFileSync("settings.json", "utf8"));

hueApi = new hue.HueApi(settings.hueBridgeIp, settings.hueUser);

hueApi.lights().then(function (result) { console.log(JSON.stringify(result, null, 2)); }).done();

for (i = 0; i < settings.dashButtons.length; i++)
{
    var button = settings.dashButtons[i];

    dashButton(button.mac, null, null, "all").on("detected", processDashButtonClick(button));
}

function processDashButtonClick(button)
{
    return function(dashId)
    {
        console.log("Dash button " + dashId + " was clicked!");

        console.log("Checking status of " + button.lights.length + " lights...");

        async.detect(button.lights.map(l => l.id), isLightOn, function(err, result)
        {
            if (result)
            {
                console.log("At least one light is on, turning off all lights...");
                async.each(button.lights, setLight(false));
            }
            else
            {
                console.log("All lights are off, turning on...");
                async.each(button.lights, setLight(true));
            }
        });

    }
}

function isLightOn(lightId, callback)
{
    hueApi.lightStatus(lightId, function(err, result)
    {
        // If error, consider this light off
        if (err)
        {
            console.error("Failed to get status of light with ID = " + lightId);
            callback(null, false);
        }

        console.log("Light " + lightId + " is currently " + (result.state.on ? "ON" : "OFF"));

        callback(null, result.state.on);
    });
}

function setLight(isOn)
{
    return function(light, callback)
    {
        var lightState = {};
        if (isOn)
        {
            lightState = light.state;
        }
        else if (light.state.transition)
        {
            lightState["transition"] = light.state.transition;
        }
        lightState["on"] = isOn;

        hueApi.setLightState(light.id, lightState, function(err, result)
        {
            if (err)
            {
                console.error("Failed to turn " + (isOn ? "ON" : "OFF") + " light with ID = " + light.id);
                console.log("Error details: " + err.message)
            }
            else
            {
                console.log("Light " + light.id + " was turned " + (isOn ? "ON" : "OFF"));
            }
        })
    }
}