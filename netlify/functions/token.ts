import { RtcTokenBuilder, RtcRole } from "agora-access-token";
import { Handler } from "@netlify/functions";

const appId = process.env.AGORA_APP_ID || "e0354f2d9122425785967ddee3934ec7";
const appCertificate = process.env.AGORA_APP_CERTIFICATE || "YOUR_APP_CERTIFICATE";

export const handler: Handler = async (event, context) => {
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method not allowed" }),
        };
    }

    try {
        const { identity, room } = JSON.parse(event.body || "{}");

        if (!identity || !room) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing required parameters" }),
            };
        }

        const expirationTimeInSeconds = 3600; // 1 hour
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

        const token = RtcTokenBuilder.buildTokenWithUid(
            appId,
            appCertificate,
            room,
            identity,
            RtcRole.PUBLISHER,
            privilegeExpiredTs
        );

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