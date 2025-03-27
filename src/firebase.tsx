import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyCWSf8JomNIKlUBERBOm7nJ8F9fa0O6qYc",
    authDomain: "videocall-e5b22.firebaseapp.com",
    projectId: "videocall-e5b22",
    storageBucket: "videocall-e5b22.firebasestorage.app",
    messagingSenderId: "398404714919",
    appId: "1:398404714919:web:bccd9e500b6fe1e68ff682",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();