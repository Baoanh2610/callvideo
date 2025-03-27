const { RtcTokenBuilder, RtcRole } = require("agora-access-token");

exports.handler = async (event, context) => {
    try {
        if (event.httpMethod !== "POST") {
            return {
                statusCode: 405,
                body: JSON.stringify({ error: "Method Not Allowed" }),
            };
        }

        const appId = process.env.AGORA_APP_ID;
        const appCertificate = process.env.AGORA_APP_CERTIFICATE;

        if (!appId || !appCertificate) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Missing AGORA_APP_ID or AGORA_APP_CERTIFICATE" }),
            };
        }

        const { identity, room } = JSON.parse(event.body);
        if (!identity || !room) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing identity or room in request body" }),
            };
        }

        const uid = identity;
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

        console.log("Request body:", { identity, room });
        console.log("Generated Agora token:", token);

        return {
            statusCode: 200,
            body: JSON.stringify({ token }),
        };
    } catch (error) {
        console.error("Error generating token:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to generate token" }),
        };
    }
};