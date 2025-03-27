const { RtcTokenBuilder, RtcRole } = require("agora-access-token");

exports.handler = async (event, context) => {
    // Chỉ xử lý POST request
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ error: "Method not allowed" }),
        };
    }

    try {
        const { identity, room } = JSON.parse(event.body);
        console.log("Request body:", { identity, room });

        const appId = process.env.AGORA_APP_ID || "e0354f2d9122425785967ddee3934ec7";
        const appCertificate = process.env.AGORA_APP_CERTIFICATE || "30148e6d8fe5405e94f1d1ec9b7ccac1";

        if (!appId || !appCertificate) {
            throw new Error("appId or appCertificate is missing");
        }

        if (!room) {
            throw new Error("Room name is missing in request body");
        }

        const uid = 0;
        const role = RtcRole.PUBLISHER;
        const expirationTimeInSeconds = 3600;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

        const token = RtcTokenBuilder.buildTokenWithUid(
            appId,
            appCertificate,
            room,
            uid,
            role,
            privilegeExpiredTs
        );

        console.log("Generated Agora token:", token);
        if (!token || typeof token !== "string") {
            throw new Error("Generated token is not a string");
        }

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ token }),
        };
    } catch (error) {
        console.error("Error generating token:", error);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ error: "Failed to generate token", details: error.message }),
        };
    }
};