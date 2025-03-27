import React, { useEffect } from "react";
import {
    signInWithPopup,
    signOut,
    GoogleAuthProvider,
    GithubAuthProvider,
    linkWithPopup,
    fetchSignInMethodsForEmail,
    AuthError,
    OAuthCredential
} from "firebase/auth";
import { auth, googleProvider, githubProvider } from "../firebase";
import { useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";

interface User {
    name: string;
    id: string;
}

interface LoginProps {
    setUser: (user: User | null) => void;
}

const Login = ({ setUser }: LoginProps) => {
    const navigate = useNavigate();

    // Đăng xuất khi vào trang đăng nhập
    useEffect(() => {
        signOut(auth)
            .then(() => {
                setUser(null); // Xóa user trong state
            })
            .catch((error) => {
                console.error("Lỗi đăng xuất:", error);
            });
    }, [setUser]);

    // Xử lý lỗi đăng nhập
    const handleSignInError = async (error: any) => {
        // Kiểm tra và log lỗi một cách an toàn
        console.error("Chi tiết lỗi:", {
            code: error.code,
            message: error.message
        });

        if (error.code === 'auth/account-exists-with-different-credential') {
            try {
                // Lấy email từ thông báo lỗi nếu có
                const emailMatch = error.message.match(/email\s*([^\s]+)/i);
                const email = emailMatch ? emailMatch[1] : null;

                if (!email) {
                    alert("Không thể xác định email tài khoản. Vui lòng thử lại.");
                    return;
                }

                // Tìm các phương thức đăng nhập đã được liên kết với email này
                const methods = await fetchSignInMethodsForEmail(auth, email);

                if (methods.includes(GoogleAuthProvider.PROVIDER_ID)) {
                    try {
                        // Nếu Google là một trong các phương thức, hãy đăng nhập bằng Google trước
                        const result = await signInWithPopup(auth, googleProvider);

                        // Sau đó liên kết thông tin đăng nhập GitHub
                        await linkWithPopup(result.user, githubProvider);

                        // Đăng nhập bằng thông tin đăng nhập GitHub đã được liên kết
                        const finalResult = await signInWithPopup(auth, githubProvider);
                        const user = finalResult.user;

                        setUser({
                            name: user.displayName || "Không xác định",
                            id: user.uid
                        });
                        navigate("/room");
                    } catch (linkError: any) {
                        console.error("Lỗi liên kết tài khoản:", linkError);
                        alert("Không thể liên kết tài khoản. Vui lòng thử lại.");
                    }
                } else {
                    // Xử lý các trường hợp khác hoặc hiển thị thông báo lỗi
                    console.error("Nhiều phương thức đăng nhập tồn tại cho tài khoản này");
                    alert("Đã có vấn đề với tài khoản của bạn. Vui lòng liên hệ hỗ trợ.");
                }
            } catch (fetchError: any) {
                console.error("Lỗi tra cứu phương thức đăng nhập:", fetchError);
                alert("Không thể xác minh tài khoản. Vui lòng thử lại.");
            }
        } else {
            console.error("Lỗi đăng nhập không xác định:", error);
            alert("Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại.");
        }
    };

    // Đăng nhập bằng Google
    const signInWithGoogle = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            setUser({ name: user.displayName || "Không xác định", id: user.uid });
            navigate("/room");
        } catch (error: any) {
            handleSignInError(error);
        }
    };

    // Đăng nhập bằng GitHub
    const signInWithGithub = async () => {
        try {
            const result = await signInWithPopup(auth, githubProvider);
            const user = result.user;
            setUser({ name: user.displayName || "Không xác định", id: user.uid });
            navigate("/room");
        } catch (error: any) {
            handleSignInError(error);
        }
    };

    return (
        <div style={{ textAlign: "center", marginTop: "20%" }}>
            <h2>Đăng nhập để tham gia gọi video</h2>
            <Button
                variant="contained"
                color="primary"
                onClick={signInWithGoogle}
                style={{ margin: "10px" }}
            >
                Đăng nhập bằng Google
            </Button>
            <Button
                variant="contained"
                color="primary"
                onClick={signInWithGithub}
                style={{ margin: "10px" }}
            >
                Đăng nhập bằng GitHub
            </Button>
        </div>
    );
};

export default Login;