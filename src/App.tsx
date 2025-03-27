import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "./firebase";
import Login from "./components/login";
import VideoRoom from "./components/videoroom";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { v4 as uuidv4 } from "uuid";

interface User {
  name: string;
  id: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("App component mounted");
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      console.log("Auth state changed:", firebaseUser);
      if (firebaseUser) {
        const userData = {
          name: firebaseUser.displayName || "Unknown",
          id: firebaseUser.uid,
        };
        console.log("Setting user data in App:", userData);
        setUser(userData);
      } else {
        console.log("No user, setting user to null");
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    console.log("App is loading");
    return <div>Đang tải...</div>;
  }

  console.log("App rendering with user:", user);
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login setUser={setUser} />} />
        <Route
          path="/select-room"
          element={
            user ? (
              <SelectRoom />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/room"
          element={
            user ? (
              <VideoRoomWrapper user={user} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

const SelectRoom = () => {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);

  useEffect(() => {
    console.log("SelectRoom component mounted");
  }, []);

  const handleCreateRoom = () => {
    console.log("Creating new room");
    const newRoomCode = uuidv4().slice(0, 8);
    setCreatedRoomCode(newRoomCode);
    console.log("Navigating to room with code:", newRoomCode);
    navigate(`/room?code=${newRoomCode}`);
  };

  const handleJoinRoom = () => {
    if (roomCode.trim()) {
      console.log("Joining room with code:", roomCode.trim());
      navigate(`/room?code=${roomCode.trim()}`);
    } else {
      console.log("No room code provided");
      alert("Vui lòng nhập mã phòng!");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "20%" }}>
      <h2>Chọn hành động</h2>
      <div style={{ margin: "20px" }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleCreateRoom}
          style={{ marginRight: "10px" }}
        >
          Tạo phòng
        </Button>
        <TextField
          label="Nhập mã phòng"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          style={{ marginRight: "10px" }}
        />
        <Button variant="contained" color="secondary" onClick={handleJoinRoom}>
          Tham gia phòng
        </Button>
      </div>
      {createdRoomCode && (
        <div style={{ marginTop: "20px" }}>
          <p>Phòng của bạn đã được tạo! Mã phòng: <strong>{createdRoomCode}</strong></p>
          <p>
            Chia sẻ URL để người khác tham gia:{" "}
            <a
              href={`https://remarkable-sprite-96ac87.netlify.app/room?code=${createdRoomCode}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              https://remarkable-sprite-96ac87.netlify.app/room?code={createdRoomCode}
            </a>
          </p>
        </div>
      )}
    </div>
  );
};

const VideoRoomWrapper = ({ user }: { user: User }) => {
  const queryParams = new URLSearchParams(window.location.search);
  const roomCode = queryParams.get("code");

  useEffect(() => {
    console.log("VideoRoomWrapper mounted with room code:", roomCode);
  }, [roomCode]);

  if (!roomCode) {
    console.log("No room code, redirecting to /select-room");
    return <Navigate to="/select-room" replace />;
  }

  console.log("Rendering VideoRoom with user:", user, "and room code:", roomCode);
  return <VideoRoom user={user} roomName={roomCode} />;
};

export default App;