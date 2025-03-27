import React, { useEffect } from "react";
import { signInWithPopup, signOut, GoogleAuthProvider, fetchSignInMethodsForEmail, linkWithPopup } from "firebase/auth";
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

    useEffect(() => {
        signOut(auth)
            .then(() => {
                setUser(null);
            })
            .catch((error) => {
                console.error("Lỗi đăng xuất:", error);
            });
    }, [setUser]);

    const handleSignInError = async (error: any) => {
        console.error("Chi tiết lỗi:", {
            code: error.code,
            message: error.message,
        });

        if (error.code === "auth/account-exists-with-different-credential") {
            try {
                const emailMatch = error.message.match(/email\s*([^\s]+)/i);
                const email = emailMatch ? emailMatch[1] : null;

                if (!email) {
                    alert("Không thể xác định email tài khoản. Vui lòng thử lại.");
                    return;
                }

                const methods = await fetchSignInMethodsForEmail(auth, email);

                if (methods.includes(GoogleAuthProvider.PROVIDER_ID)) {
                    try {
                        const result = await signInWithPopup(auth, googleProvider);
                        await linkWithPopup(result.user, githubProvider);
                        const finalResult = await signInWithPopup(auth, githubProvider);
                        const user = finalResult.user;

                        setUser({
                            name: user.displayName || "Không xác định",
                            id: user.uid,
                        });
                        navigate("/room");
                    } catch (linkError: any) {
                        console.error("Lỗi liên kết tài khoản:", linkError);
                        alert("Không thể liên kết tài khoản. Vui lòng thử lại.");
                    }
                } else {
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