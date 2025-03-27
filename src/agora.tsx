import AgoraRTC, { IAgoraRTCClient } from "agora-rtc-sdk-ng";

export const connectToChannel = async (token: string, channelName: string, appId: string, uid: string): Promise<IAgoraRTCClient> => {
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    try {
        await client.join(appId, channelName, token, uid);
        return client;
    } catch (error: unknown) {
        let errorMessage: string;
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === "string") {
            errorMessage = error;
        } else {
            errorMessage = "Lỗi không xác định";
        }
        throw new Error(`Failed to join channel: ${errorMessage}`);
    }
};