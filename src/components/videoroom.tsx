import React, { useState, useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import { connectToChannel } from "../agora";
import AgoraRTC, { IAgoraRTCClient, IAgoraRTCRemoteUser, IMicrophoneAudioTrack, ICameraVideoTrack } from "agora-rtc-sdk-ng";

interface User {
    name: string;
    id: string;
}

interface VideoRoomProps {
    user: User;
    roomName: string;
}

const VideoRoom = ({ user, roomName }: VideoRoomProps) => {
    const navigate = useNavigate();
    const [client, setClient] = useState<IAgoraRTCClient | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [participants, setParticipants] = useState<IAgoraRTCRemoteUser[]>([]);
    const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
    const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});

    const appId = process.env.REACT_APP_AGORA_APP_ID || "e0354f2d9122425785967ddee3934ec7";
    const channelName = roomName;

    const handleSignOut = async () => {
        try {
            if (client) {
                client.leave();
            }
            await signOut(auth);
            navigate("/");
        } catch (error: unknown) {
            console.error("Sign out error:", error);
            const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
            alert(`Lỗi đăng xuất: ${errorMessage}`);
        }
    };

    useEffect(() => {
        const fetchToken = async () => {
            try {
                const response = await fetch("/api/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ identity: user.id, room: channelName }),
                });
                console.log("Request body sent:", { identity: user.id, room: channelName });
                console.log("Response status:", response.status);
                console.log("Response headers:", response.headers);
                const contentType = response.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    const text = await response.text();
                    throw new Error(`Expected JSON, but received: ${text}`);
                }
                const data = await response.json();
                console.log("Full response from server:", data);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}, message: ${data.error || "Unknown error"}`);
                }
                if (!data.token) {
                    throw new Error("Token not found in response");
                }
                if (typeof data.token !== "string") {
                    throw new Error("Token is not a string");
                }
                console.log("Received token:", data.token);
                setToken(data.token);
            } catch (error: unknown) {
                console.error("Error fetching token:", error);
                const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
                alert(`Không thể lấy token: ${errorMessage}`);
            }
        };
        fetchToken();
    }, [user, channelName]);

    useEffect(() => {
        if (!token) return;

        const setupChannel = async () => {
            try {
                const agoraClient = await connectToChannel(token, channelName, appId);
                setClient(agoraClient);

                agoraClient.on("user-published", async (remoteUser, mediaType) => {
                    await agoraClient.subscribe(remoteUser, mediaType);
                    if (mediaType === "video" && remoteUser.videoTrack) {
                        const videoElement = videoRefs.current[remoteUser.uid!.toString()];
                        if (videoElement) remoteUser.videoTrack.play(videoElement);
                    }
                    if (mediaType === "audio" && remoteUser.audioTrack) {
                        remoteUser.audioTrack.play();
                    }
                    setParticipants((prev) => [...prev.filter(p => p.uid !== remoteUser.uid), remoteUser]);
                });

                agoraClient.on("user-unpublished", (remoteUser) => {
                    setParticipants((prev) => prev.filter(p => p.uid !== remoteUser.uid));
                });
            } catch (error: unknown) {
                console.error("Error connecting to channel:", error);
                let errorMessage: string;
                if (error instanceof Error) {
                    errorMessage = error.message;
                } else if (typeof error === "string") {
                    errorMessage = error;
                } else {
                    errorMessage = "Lỗi không xác định";
                }
                alert(`Không thể kết nối phòng. Vui lòng thử lại. Chi tiết lỗi: ${errorMessage}`);
            }
        };

        setupChannel();

        return () => {
            if (client) {
                client.leave();
                setClient(null);
            }
        };
    }, [token, appId, channelName, client]);

    const toggleCameraAndMic = async () => {
        if (!client) return;

        try {
            if (isCameraOn) {
                if (localVideoTrack) {
                    await client.unpublish(localVideoTrack);
                    localVideoTrack.stop();
                    localVideoTrack.close();
                    setLocalVideoTrack(null);
                }
                if (localAudioTrack) {
                    await client.unpublish(localAudioTrack);
                    localAudioTrack.stop();
                    localAudioTrack.close();
                    setLocalAudioTrack(null);
                }
                setIsCameraOn(false);
            } else {
                const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
                const videoTrack = await AgoraRTC.createCameraVideoTrack();
                await client.publish([audioTrack, videoTrack]);
                const localVideoElement = videoRefs.current[user.id];
                if (localVideoElement) videoTrack.play(localVideoElement);
                setLocalAudioTrack(audioTrack);
                setLocalVideoTrack(videoTrack);
                setIsCameraOn(true);
            }
        } catch (error: unknown) {
            console.error("Error toggling camera/mic:", error);
            const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
            alert(`Lỗi khi chuyển đổi camera/mic: ${errorMessage}`);
        }
    };

    return (
        <div>
            <h2>Phòng Video - Chào {user.name}! (Phòng: {channelName})</h2>
            <div style={{ display: "flex", flexWrap: "wrap" }}>
                <div key={user.id} style={{ margin: "10px", textAlign: "center" }}>
                    <p>{user.name} (You)</p>
                    <video
                        ref={(el) => {
                            if (el) videoRefs.current[user.id] = el;
                        }}
                        style={{ width: "300px", height: "200px", backgroundColor: "black", objectFit: "cover" }}
                        autoPlay
                        playsInline
                        muted
                    />
                </div>
                {participants.map((participant) => (
                    <div key={participant.uid!.toString()} style={{ margin: "10px", textAlign: "center" }}>
                        <p>User {participant.uid}</p>
                        <video
                            ref={(el) => {
                                if (el) videoRefs.current[participant.uid!.toString()] = el;
                            }}
                            style={{ width: "300px", height: "200px", backgroundColor: "black", objectFit: "cover" }}
                            autoPlay
                            playsInline
                        />
                    </div>
                ))}
            </div>
            <div>
                <Button
                    variant="contained"
                    color={isCameraOn ? "secondary" : "primary"}
                    onClick={toggleCameraAndMic}
                >
                    {isCameraOn ? "Tắt Camera/Mic" : "Bật Camera/Mic"}
                </Button>
                <Button variant="contained" color="secondary" onClick={handleSignOut}>
                    Đăng xuất
                </Button>
            </div>
        </div>
    );
};

export default VideoRoom;