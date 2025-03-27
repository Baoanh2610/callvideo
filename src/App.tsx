import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "./firebase";
import Login from "./components/login";
import VideoRoom from "./components/videoroom";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { v4 as uuidv4 } from "uuid"; // Thêm uuid để tạo mã room

interface User {
  name: string;
  id: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userData = {
          name: firebaseUser.displayName || "Unknown",
          id: firebaseUser.uid,
        };
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div>Đang tải...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login setUser={setUser} />} />
        <Route
          path="/select-room"
          element={user ? <SelectRoom /> : <Navigate to="/" replace />}
        />
        <Route
          path="/room"
          element={user ? <VideoRoomWrapper user={user} /> : <Navigate to="/" replace />}
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

  const handleCreateRoom = () => {
    const newRoomCode = uuidv4().slice(0, 8); // Tạo mã room ngẫu nhiên (8 ký tự)
    setCreatedRoomCode(newRoomCode);
    navigate(`/room?code=${newRoomCode}`);
  };

  const handleJoinRoom = () => {
    if (roomCode.trim()) {
      navigate(`/room?code=${roomCode.trim()}`);
    } else {
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
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(window.location.search);
  const roomCode = queryParams.get("code");

  if (!roomCode) {
    return <Navigate to="/select-room" replace />;
  }

  return <VideoRoom user={user} roomName={roomCode} />;
};

export default App;