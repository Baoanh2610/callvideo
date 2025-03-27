import React, { useState, useEffect, useRef, useCallback } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import AgoraRTC, {
    IAgoraRTCClient,
    IAgoraRTCRemoteUser,
    IMicrophoneAudioTrack,
    ICameraVideoTrack,
    AgoraRTCError,
} from "agora-rtc-sdk-ng";

// User and Room Types
interface User {
    name: string;
    id: string;
}

interface VideoRoomProps {
    user: User;
    roomName: string;
}

// Connection Status Enum
enum ConnectionStatus {
    CONNECTING = "Connecting...",
    CONNECTED = "Connected Successfully",
    DISCONNECTED = "Disconnected",
    ERROR = "Connection Error",
}

const VideoRoom: React.FC<VideoRoomProps> = ({ user, roomName }) => {
    const navigate = useNavigate();

    // State Management
    const [client, setClient] = useState<IAgoraRTCClient | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [participants, setParticipants] = useState<IAgoraRTCRemoteUser[]>([]);
    const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
    const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.CONNECTING);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    // Refs and Unique Identifiers
    const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
    const [uniqueUid, setUniqueUid] = useState<string>("");

    // Agora Configuration
    const appId = process.env.REACT_APP_AGORA_APP_ID || "e0354f2d9122425785967ddee3934ec7";
    const channelName = roomName;

    // Safe Video Play Function
    const safePlayVideo = useCallback((track: any, key: string) => {
        const videoElement = videoRefs.current[key];
        if (track && videoElement) {
            track.play(videoElement);
        }
    }, []);

    // Create Unique ID on Mount
    useEffect(() => {
        const createUniqueId = () => {
            const timestamp = Date.now();
            return `${user.id}-${timestamp}`;
        };
        setUniqueUid(createUniqueId());
    }, [user.id]);

    // Fetch Token from Server
    useEffect(() => {
        const fetchToken = async () => {
            try {
                if (!uniqueUid || !channelName) return;

                const response = await fetch("/api/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ identity: uniqueUid, room: channelName }),
                });

                console.log("Request body sent:", { identity: uniqueUid, room: channelName });
                console.log("Response status:", response.status);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || "Unknown error"}`);
                }

                const data = await response.json();
                if (!data.token || typeof data.token !== "string") {
                    throw new Error("Token not found or invalid in response");
                }

                console.log("Received token:", data.token);
                setToken(data.token);
                setConnectionError(null);
            } catch (error) {
                console.error("Error fetching token:", error);
                const errorMessage = error instanceof Error ? error.message : "Unknown Error";
                setConnectionStatus(ConnectionStatus.ERROR);
                setConnectionError(`Failed to fetch token: ${errorMessage}`);
            }
        };

        fetchToken();
    }, [uniqueUid, channelName, setToken, setConnectionStatus, setConnectionError]);

    // Logout Handler
    const handleSignOut = async () => {
        try {
            // Disconnect Agora
            if (client) {
                await client.leave();
                setClient(null);
            }

            // Stop and Close Tracks
            [localAudioTrack, localVideoTrack].forEach((track) => {
                if (track) {
                    track.stop();
                    track.close();
                }
            });

            setLocalAudioTrack(null);
            setLocalVideoTrack(null);
            setParticipants([]);
            setConnectionStatus(ConnectionStatus.DISCONNECTED);
            setConnectionError(null);

            // Firebase Logout
            await signOut(auth);
            navigate("/");
        } catch (error) {
            console.error("Logout Error:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown Error";
            setConnectionStatus(ConnectionStatus.ERROR);
            setConnectionError(`Logout Failed: ${errorMessage}`);
        }
    };

    // Agora Channel Setup
    useEffect(() => {
        if (!token || !uniqueUid || !appId) return;

        const setupAgoraClient = async () => {
            try {
                setConnectionStatus(ConnectionStatus.CONNECTING);

                const agoraClient = AgoraRTC.createClient({
                    mode: "rtc",
                    codec: "vp8",
                });

                // Error Handler with Typed Error
                agoraClient.on("error", (err: AgoraRTCError) => {
                    console.error("Agora Client Error:", err);
                    setConnectionStatus(ConnectionStatus.ERROR);
                    const errorMessage = err.message || "Unknown Error";
                    const detailedErrorMessage = `Error Code: ${err.code}, Details: ${errorMessage}`;
                    setConnectionError(detailedErrorMessage);
                });

                // Token Renewal Handlers
                agoraClient.on("token-privilege-will-expire", async () => {
                    console.log("Token will expire soon, fetching new token...");
                    try {
                        const response = await fetch("/api/token", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ identity: uniqueUid, room: channelName }),
                        });
                        const data = await response.json();
                        if (data.token) {
                            await agoraClient.renewToken(data.token);
                            setToken(data.token);
                            console.log("Token renewed:", data.token);
                        }
                    } catch (error) {
                        console.error("Error renewing token:", error);
                        setConnectionStatus(ConnectionStatus.ERROR);
                        setConnectionError("Failed to renew token");
                    }
                });

                agoraClient.on("token-privilege-did-expire", async () => {
                    console.log("Token expired, fetching new token...");
                    try {
                        const response = await fetch("/api/token", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ identity: uniqueUid, room: channelName }),
                        });
                        const data = await response.json();
                        if (data.token) {
                            await agoraClient.renewToken(data.token);
                            setToken(data.token);
                            console.log("Token renewed:", data.token);
                        }
                    } catch (error) {
                        console.error("Error renewing token:", error);
                        setConnectionStatus(ConnectionStatus.ERROR);
                        setConnectionError("Failed to renew token after expiration");
                    }
                });

                // Connect to Channel
                await agoraClient.join(appId, channelName, token, uniqueUid);
                setClient(agoraClient);
                setConnectionStatus(ConnectionStatus.CONNECTED);
                setConnectionError(null);

                // New User Event Handler
                agoraClient.on("user-published", async (user, mediaType) => {
                    try {
                        await agoraClient.subscribe(user, mediaType);
                        setParticipants((prev) =>
                            prev.some((p) => p.uid === user.uid) ? prev : [...prev, user]
                        );

                        // Play Video/Audio of New User
                        if (mediaType === "video" && user.videoTrack) {
                            safePlayVideo(user.videoTrack, user.uid!.toString());
                        }
                        if (mediaType === "audio" && user.audioTrack) {
                            user.audioTrack.play();
                        }
                    } catch (subscribeError) {
                        console.error("User Subscription Error:", subscribeError);
                    }
                });

                // User Left Event Handler
                agoraClient.on("user-unpublished", (user) => {
                    setParticipants((prev) => prev.filter((p) => p.uid !== user.uid));
                });

                // Initialize Local Tracks
                const [audioTrack, videoTrack] = await Promise.all([
                    AgoraRTC.createMicrophoneAudioTrack(),
                    AgoraRTC.createCameraVideoTrack(),
                ]);

                setLocalAudioTrack(audioTrack);
                setLocalVideoTrack(videoTrack);

                // Publish Local Tracks
                await agoraClient.publish([audioTrack, videoTrack]);

                // Play local video track
                safePlayVideo(videoTrack, uniqueUid);
                setIsCameraOn(true);
            } catch (error) {
                console.error("Agora Connection Error:", error);
                const errorMessage = error instanceof Error ? error.message : "Unknown Error";
                setConnectionStatus(ConnectionStatus.ERROR);
                setConnectionError(`Connection Error: ${errorMessage}`);
            }
        };

        setupAgoraClient();

        // Cleanup Function
        return () => {
            if (client) {
                client.leave().catch((err) => {
                    console.error("Failed to leave channel during cleanup:", err);
                });
                setClient(null);
            }
            [localAudioTrack, localVideoTrack].forEach((track) => {
                if (track) {
                    track.stop();
                    track.close();
                }
            });
            setLocalAudioTrack(null);
            setLocalVideoTrack(null);
            setParticipants([]);
            setConnectionStatus(ConnectionStatus.DISCONNECTED);
        };
    }, [token, appId, channelName, uniqueUid, safePlayVideo, setLocalAudioTrack, setLocalVideoTrack, setParticipants, setConnectionStatus, setConnectionError, setClient, setIsCameraOn]);

    // Toggle Camera
    const toggleCamera = async () => {
        if (localVideoTrack) {
            if (isCameraOn) {
                localVideoTrack.stop();
            } else {
                safePlayVideo(localVideoTrack, uniqueUid);
            }
            setIsCameraOn(!isCameraOn);
        }
    };

    // Dynamic Video Ref Callback
    const setVideoRef = useCallback((key: string) => (el: HTMLVideoElement | null) => {
        videoRefs.current[key] = el;
    }, []);

    return (
        <div className="video-room-container">
            <h2>Video Room - {user.name} (Room: {channelName})</h2>

            {/* Connection Status and Error Display */}
            <p>Status: {connectionStatus}</p>
            {connectionError && (
                <div className="error-message" style={{ color: "red", marginBottom: "10px" }}>
                    {connectionError}
                </div>
            )}

            {/* Local User Video */}
            <div className="local-video-container">
                <video
                    ref={setVideoRef(uniqueUid)}
                    style={{
                        width: "300px",
                        height: "200px",
                        display: isCameraOn ? "block" : "none",
                    }}
                />
            </div>

            {/* Remote Participants Video */}
            <div className="remote-participants">
                {participants.map((participant) => (
                    <video
                        key={participant.uid!.toString()}
                        ref={setVideoRef(participant.uid!.toString())}
                        style={{ width: "300px", height: "200px" }}
                    />
                ))}
            </div>

            {/* Control Buttons */}
            <div className="video-controls">
                <Button onClick={toggleCamera} variant="contained" disabled={!client}>
                    {isCameraOn ? "Turn Off Camera" : "Turn On Camera"}
                </Button>
                <Button onClick={handleSignOut} variant="contained" color="secondary">
                    Leave Room
                </Button>
            </div>
        </div>
    );
};

export default VideoRoom;