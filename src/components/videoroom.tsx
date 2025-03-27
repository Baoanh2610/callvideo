import React, { useState, useEffect, useRef, useCallback } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import AgoraRTC, {
    IAgoraRTCClient,
    IAgoraRTCRemoteUser,
    IMicrophoneAudioTrack,
    ICameraVideoTrack
} from "agora-rtc-sdk-ng";

// Định nghĩa interface
interface User {
    name: string;
    id: string;
}

interface VideoRoomProps {
    user: User;
    roomName: string;
}

// Enum trạng thái kết nối
enum ConnectionStatus {
    CONNECTING = "Đang kết nối...",
    CONNECTED = "Đã kết nối thành công",
    DISCONNECTED = "Đã ngắt kết nối",
    ERROR = "Lỗi kết nối"
}

const VideoRoom: React.FC<VideoRoomProps> = ({ user, roomName }) => {
    const navigate = useNavigate();

    // Quản lý trạng thái
    const [client, setClient] = useState<IAgoraRTCClient | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [participants, setParticipants] = useState<IAgoraRTCRemoteUser[]>([]);
    const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
    const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.CONNECTING);

    // Quản lý refs video
    const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
    const [uniqueUid, setUniqueUid] = useState<string>("");

    // Cấu hình Agora
    const appId = process.env.REACT_APP_AGORA_APP_ID || "YOUR_AGORA_APP_ID";
    const channelName = roomName;

    // Tạo ref callback động
    const setVideoRef = useCallback((key: string) => (el: HTMLVideoElement | null) => {
        videoRefs.current[key] = el;
    }, []);

    // Tạo unique ID
    useEffect(() => {
        const createUniqueId = () => {
            const timestamp = Date.now();
            return `${user.id}-${timestamp}`;
        };
        setUniqueUid(createUniqueId());
    }, [user.id]);

    // Xử lý đăng xuất
    const handleSignOut = async () => {
        try {
            // Ngắt kết nối Agora
            if (client) {
                await client.leave();
                setClient(null);
            }

            // Dừng và đóng track
            [localAudioTrack, localVideoTrack].forEach(track => {
                if (track) {
                    track.stop();
                    track.close();
                }
            });

            // Đăng xuất Firebase
            await signOut(auth);
            navigate("/");
        } catch (error) {
            console.error("Lỗi đăng xuất:", error);
            alert(`Không thể đăng xuất: ${error instanceof Error ? error.message : "Lỗi không xác định"}`);
        }
    };

    // Lấy token
    useEffect(() => {
        const fetchToken = async () => {
            try {
                const response = await fetch("/api/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        identity: uniqueUid,
                        room: channelName
                    })
                });

                if (!response.ok) {
                    throw new Error(`Lỗi HTTP: ${response.status}`);
                }

                const data = await response.json();
                if (!data.token) {
                    throw new Error("Không nhận được token");
                }

                setToken(data.token);
                setConnectionStatus(ConnectionStatus.CONNECTED);
            } catch (error) {
                console.error("Lỗi lấy token:", error);
                setConnectionStatus(ConnectionStatus.ERROR);
                alert(`Lỗi kết nối: ${error instanceof Error ? error.message : "Không xác định"}`);
            }
        };

        if (uniqueUid) {
            fetchToken();
        }
    }, [uniqueUid, channelName]);

    // Thiết lập kênh Agora
    useEffect(() => {
        if (!token) return;

        const setupAgoraClient = async () => {
            try {
                // Tạo client Agora
                const agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

                // Kết nối đến kênh
                await agoraClient.join(appId, channelName, token, parseInt(uniqueUid.split('-')[0]));
                setClient(agoraClient);
                setConnectionStatus(ConnectionStatus.CONNECTED);

                // Xử lý sự kiện người dùng mới
                agoraClient.on("user-published", async (user, mediaType) => {
                    await agoraClient.subscribe(user, mediaType);
                    setParticipants(prev =>
                        prev.some(p => p.uid === user.uid)
                            ? prev
                            : [...prev, user]
                    );

                    // Phát video/audio của người dùng mới
                    if (mediaType === "video" && user.videoTrack) {
                        const videoElement = videoRefs.current[user.uid!.toString()];
                        if (videoElement) user.videoTrack.play(videoElement);
                    }
                    if (mediaType === "audio" && user.audioTrack) {
                        user.audioTrack.play();
                    }
                });

                // Xử lý sự kiện người dùng rời đi
                agoraClient.on("user-unpublished", (user) => {
                    setParticipants(prev => prev.filter(p => p.uid !== user.uid));
                });

            } catch (error) {
                console.error("Lỗi kết nối Agora:", error);
                setConnectionStatus(ConnectionStatus.ERROR);
                alert(`Lỗi kết nối: ${error instanceof Error ? error.message : "Không xác định"}`);
            }
        };

        setupAgoraClient();

        // Hàm dọn dẹp
        return () => {
            if (client) {
                client.leave();
                setClient(null);
            }
            [localAudioTrack, localVideoTrack].forEach(track => {
                if (track) {
                    track.stop();
                    track.close();
                }
            });
        };
    }, [token, appId, channelName, uniqueUid, client, localAudioTrack, localVideoTrack]);

    // Bật/tắt camera và micro
    const toggleCameraAndMic = async () => {
        if (!client) return;

        try {
            if (isCameraOn) {
                // Tắt camera
                if (localVideoTrack) await client.unpublish(localVideoTrack);
                if (localAudioTrack) await client.unpublish(localAudioTrack);

                [localVideoTrack, localAudioTrack].forEach(track => {
                    if (track) {
                        track.stop();
                        track.close();
                    }
                });

                setLocalVideoTrack(null);
                setLocalAudioTrack(null);
                setIsCameraOn(false);
            } else {
                // Bật camera
                const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
                const videoTrack = await AgoraRTC.createCameraVideoTrack();

                await client.publish([audioTrack, videoTrack]);

                const localVideoElement = videoRefs.current[uniqueUid];
                if (localVideoElement) videoTrack.play(localVideoElement);

                setLocalAudioTrack(audioTrack);
                setLocalVideoTrack(videoTrack);
                setIsCameraOn(true);
            }
        } catch (error) {
            console.error("Lỗi chuyển đổi camera/mic:", error);
            alert(`Lỗi: ${error instanceof Error ? error.message : "Không xác định"}`);
        }
    };

    return (
        <div className="video-room-container">
            <h2>Phòng Video - {user.name} (Phòng: {channelName})</h2>
            <p>Trạng thái: {connectionStatus}</p>

            <div className="video-grid">
                {/* Video của người dùng hiện tại */}
                <div key={uniqueUid} className="video-item">
                    <p>{user.name} (Bạn)</p>
                    <video
                        ref={setVideoRef(uniqueUid)}
                        className="video-element"
                        autoPlay
                        playsInline
                        muted
                    />
                </div>

                {/* Video của các người dùng khác */}
                {participants.map((participant) => (
                    <div
                        key={participant.uid!.toString()}
                        className="video-item"
                    >
                        <p>Người dùng {participant.uid}</p>
                        <video
                            ref={setVideoRef(participant.uid!.toString())}
                            className="video-element"
                            autoPlay
                            playsInline
                        />
                    </div>
                ))}
            </div>

            <div className="control-buttons">
                <Button
                    variant="contained"
                    color={isCameraOn ? "secondary" : "primary"}
                    onClick={toggleCameraAndMic}
                >
                    {isCameraOn ? "Tắt Camera/Mic" : "Bật Camera/Mic"}
                </Button>
                <Button
                    variant="contained"
                    color="error"
                    onClick={handleSignOut}
                >
                    Đăng xuất
                </Button>
            </div>
        </div>
    );
};

export default VideoRoom;