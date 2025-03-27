import AgoraRTC, { IAgoraRTCClient } from "agora-rtc-sdk-ng";

export const connectToChannel = async (token: string, channelName: string, appId: string): Promise<IAgoraRTCClient> => {
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

    try {
        await client.join(appId, channelName, token, null); // UID = null để Agora tự gán
        console.log("Connected to Agora channel:", channelName);
        return client;
    } catch (error) {
        console.error("Error connecting to Agora channel:", error);
        throw error;
    }
};