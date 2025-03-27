const { RtcTokenBuilder, RtcRole } = require("agora-access-token");

module.exports = async (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
        console.error("FRONTEND_URL is not set");
        return res.status(500).json({ error: "Server configuration error: FRONTEND_URL is missing" });
    }

    res.setHeader("Access-Control-Allow-Origin", frontendUrl);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    console.log(`CORS set for origin: ${frontendUrl}`);

    if (req.method === "OPTIONS") {
        console.log("Handling OPTIONS request");
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        console.log(`Method not allowed: ${req.method}`);
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { identity, room } = req.body;
    console.log("Request body:", req.body);

    try {
        const appId = process.env.AGORA_APP_ID || "e0354f2d9122425785967ddee3934ec7";
        const appCertificate = process.env.AGORA_APP_CERTIFICATE || "30148e6d8fe5405e94f1d1ec9b7ccac1";

        console.log("Using appId:", appId);
        console.log("Using appCertificate:", appCertificate);

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

        res.status(200).json({ token });
    } catch (error) {
        console.error("Error generating token:", error);
        res.status(500).json({ error: "Failed to generate token", details: error.message });
    }
};