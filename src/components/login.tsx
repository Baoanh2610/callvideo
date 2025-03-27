import React, { useEffect } from "react";
import { signInWithRedirect, signOut, GoogleAuthProvider, fetchSignInMethodsForEmail, linkWithRedirect, getRedirectResult } from "firebase/auth";
import { auth, googleProvider, githubProvider } from "../firebase";
import { useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import { Alert, Snackbar } from "@mui/material";

interface User {
    name: string;
    id: string;
}

interface LoginProps {
    setUser: (user: User | null) => void;
}

const Login = ({ setUser }: LoginProps) => {
    const navigate = useNavigate();
    const [error, setError] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);

    useEffect(() => {
        // Xử lý kết quả đăng nhập sau khi chuyển hướng
        getRedirectResult(auth)
            .then((result) => {
                if (result?.user) {
                    setUser({
                        name: result.user.displayName || "Không xác định",
                        id: result.user.uid,
                    });
                    navigate("/room");
                }
            })
            .catch((error) => {
                handleSignInError(error);
            });

        // Đăng xuất khi component mount
        signOut(auth)
            .then(() => {
                setUser(null);
            })
            .catch((error) => {
                console.error("Lỗi đăng xuất:", error);
            });
    }, [setUser, navigate]);

    const handleSignInError = async (error: any) => {
        console.error("Chi tiết lỗi:", {
            code: error.code,
            message: error.message,
        });

        let errorMessage = "Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại.";

        switch (error.code) {
            case "auth/account-exists-with-different-credential":
                try {
                    const emailMatch = error.message.match(/email\s*([^\s]+)/i);
                    const email = emailMatch ? emailMatch[1] : null;

                    if (!email) {
                        errorMessage = "Không thể xác định email tài khoản. Vui lòng thử lại.";
                        break;
                    }

                    const methods = await fetchSignInMethodsForEmail(auth, email);

                    if (methods.includes(GoogleAuthProvider.PROVIDER_ID)) {
                        try {
                            await signInWithRedirect(auth, googleProvider);
                            return;
                        } catch (linkError: any) {
                            errorMessage = "Không thể liên kết tài khoản. Vui lòng thử lại.";
                        }
                    } else {
                        errorMessage = "Đã có vấn đề với tài khoản của bạn. Vui lòng liên hệ hỗ trợ.";
                    }
                } catch (fetchError: any) {
                    errorMessage = "Không thể xác minh tài khoản. Vui lòng thử lại.";
                }
                break;
            default:
                errorMessage = `Lỗi đăng nhập: ${error.message}`;
        }

        setError(errorMessage);
        setIsLoading(false);
    };

    const signInWithGoogle = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await signInWithRedirect(auth, googleProvider);
        } catch (error: any) {
            handleSignInError(error);
        }
    };

    const signInWithGithub = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await signInWithRedirect(auth, githubProvider);
        } catch (error: any) {
            handleSignInError(error);
        }
    };

    return (
        <div style={{ textAlign: "center", marginTop: "20%" }}>
            <h2>Đăng nhập</h2>
            <div style={{ margin: "20px" }}>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={signInWithGoogle}
                    disabled={isLoading}
                    style={{ marginRight: "10px" }}
                >
                    Đăng nhập với Google
                </Button>
                <Button
                    variant="contained"
                    color="secondary"
                    onClick={signInWithGithub}
                    disabled={isLoading}
                >
                    Đăng nhập với GitHub
                </Button>
            </div>
            <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={() => setError(null)}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert onClose={() => setError(null)} severity="error" sx={{ width: "100%" }}>
                    {error}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default Login;