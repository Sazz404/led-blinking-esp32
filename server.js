const express = require("express");

const app = express();

// Allow JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======================================================
// SMART SWITCH STATE
// ======================================================

let switchState = "OFF";

// ======================================================
// WEB DASHBOARD
// ======================================================

app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Smart Switch</title>

    <meta name="viewport" content="width=device-width, initial-scale=1">

    <style>
        body {
            font-family: Arial, sans-serif;
            background: #f2f2f2;
            text-align: center;
            margin: 0;
            padding: 40px;
        }

        .container {
            max-width: 500px;
            margin: auto;
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        }

        h1 {
            margin-bottom: 10px;
        }

        #status {
            font-size: 28px;
            font-weight: bold;
            margin: 30px;
        }

        button {
            padding: 15px 35px;
            font-size: 20px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            background: #007bff;
            color: white;
        }

        button:hover {
            background: #0056b3;
        }
    </style>
</head>

<body>

<div class="container">

    <h1>💡 Smart Switch</h1>

    <p>Cloud Smart Switch Dashboard</p>

    <div id="status">
        Loading...
    </div>

    <button onclick="toggleSwitch()">
        Toggle Switch
    </button>

</div>

<script>

async function updateStatus() {

    try {

        const response = await fetch("/status");

        const data = await response.json();

        document.getElementById("status").innerHTML =
            "Switch: " + data.state;

    } catch (error) {

        document.getElementById("status").innerHTML =
            "Connection Error";

    }
}


// Toggle switch

async function toggleSwitch() {

    try {

        const response = await fetch("/toggle", {
            method: "POST"
        });

        const data = await response.json();

        document.getElementById("status").innerHTML =
            "Switch: " + data.state;

    } catch (error) {

        alert("Unable to toggle switch");

    }
}


// Check status every 2 seconds

setInterval(updateStatus, 2000);

updateStatus();

</script>

</body>
</html>
  `);
});

// ======================================================
// STATUS
// GET /status
// ======================================================

app.get("/status", (req, res) => {

    res.json({
        state: switchState
    });

});

// ======================================================
// TOGGLE
// POST /toggle
// ======================================================

app.post("/toggle", (req, res) => {

    if (switchState === "ON") {
        switchState = "OFF";
    } else {
        switchState = "ON";
    }

    console.log("Switch changed to:", switchState);

    res.json({
        success: true,
        state: switchState
    });

});

// ======================================================
// HARDWARE UPDATE
// POST /update
//
// Example JSON:
//
// {
//     "state": "ON"
// }
//
// ======================================================

app.post("/update", (req, res) => {

    const requestedState = req.body.state;

    if (
        requestedState !== "ON" &&
        requestedState !== "OFF"
    ) {

        return res.status(400).json({
            success: false,
            error: "State must be ON or OFF"
        });

    }

    switchState = requestedState;

    console.log(
        "Hardware updated switch to:",
        switchState
    );

    res.json({
        success: true,
        state: switchState
    });

});

// ======================================================
// OAUTH AUTHORIZE
// GET /oauth/authorize
// ======================================================

app.get("/oauth/authorize", (req, res) => {

    const redirectUri = req.query.redirect_uri;

    if (!redirectUri) {

        return res.status(400).send(
            "Missing redirect_uri"
        );

    }

    // Demo authorization code
    const authorizationCode =
        "demo_authorization_code";

    const redirectUrl =
        `${redirectUri}?code=${authorizationCode}`;

    res.redirect(redirectUrl);

});

// ======================================================
// OAUTH AUTHORIZE
// POST /oauth/authorize
// ======================================================

app.post("/oauth/authorize", (req, res) => {

    const redirectUri = req.body.redirect_uri;

    if (!redirectUri) {

        return res.status(400).json({
            error: "Missing redirect_uri"
        });

    }

    const authorizationCode =
        "demo_authorization_code";

    res.json({
        code: authorizationCode
    });

});

// ======================================================
// OAUTH TOKEN
// POST /oauth/token
// ======================================================

app.post("/oauth/token", (req, res) => {

    const grantType = req.body.grant_type;

    // Demo access token
    const accessToken = "demo_access_token";

    res.json({

        access_token: accessToken,

        token_type: "Bearer",

        expires_in: 3600,

        refresh_token: "demo_refresh_token"

    });

});

// ======================================================
// GOOGLE SMART HOME FULFILLMENT
// POST /google-fulfillment
// ======================================================

app.post("/google-fulfillment", (req, res) => {

    const request = req.body;

    console.log(
        "Google Smart Home Request:",
        JSON.stringify(request, null, 2)
    );

    const inputs = request.inputs || [];

    const intent =
        inputs.length > 0
            ? inputs[0].intent
            : null;


    // ==================================================
    // SYNC
    // ==================================================

    if (
        intent ===
        "action.devices.SYNC"
    ) {

        return res.json({

            requestId:
                request.requestId || "123456",

            payload: {

                agentUserId: "demo-user",

                devices: [

                    {
                        id: "smart-switch-1",

                        type: "action.devices.types.SWITCH",

                        traits: [
                            "action.devices.traits.OnOff"
                        ],

                        name: {
                            name: "Smart Switch"
                        },

                        willReportState: false,

                        attributes: {}

                    }

                ]

            }

        });

    }


    // ==================================================
    // QUERY
    // ==================================================

    if (
        intent ===
        "action.devices.QUERY"
    ) {

        return res.json({

            requestId:
                request.requestId || "123456",

            payload: {

                devices: {

                    "smart-switch-1": {

                        online: true,

                        on:
                            switchState === "ON"

                    }

                }

            }

        });

    }


    // ==================================================
    // EXECUTE
    // ==================================================

    if (
        intent ===
        "action.devices.EXECUTE"
    ) {

        const commands =
            request.inputs[0]
                .payload
                .commands || [];


        for (const command of commands) {

            const devices =
                command.devices || [];

            for (const device of devices) {

                const execution =
                    command.execution || [];

                for (const action of execution) {

                    if (
                        action.command ===
                        "action.devices.commands.OnOff"
                    ) {

                        const requestedOn =
                            action.params.on;

                        if (requestedOn === true) {

                            switchState = "ON";

                        } else {

                            switchState = "OFF";

                        }

                    }

                }

            }

        }


        return res.json({

            requestId:
                request.requestId || "123456",

            payload: {

                commands: [

                    {

                        ids: [
                            "smart-switch-1"
                        ],

                        status: "SUCCESS",

                        states: {

                            online: true,

                            on:
                                switchState === "ON"

                        }

                    }

                ]

            }

        });

    }


    // ==================================================
    // UNKNOWN INTENT
    // ==================================================

    return res.status(400).json({

        error: "Unknown Google Smart Home intent"

    });

});

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/health", (req, res) => {

    res.json({

        status: "OK",

        switch: switchState

    });

});

// ======================================================
// START SERVER
// ======================================================

// Render provides the PORT environment variable.
// For local testing, it will use port 3000.

const PORT =
    process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(
        `Smart Switch Server running on port ${PORT}`
    );

});
