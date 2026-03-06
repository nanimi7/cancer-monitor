import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAZFRI8-nsw2bLEMUwR8i4bPnUwUPC2uJo",
  authDomain: "cancer-monitor.firebaseapp.com",
  projectId: "cancer-monitor",
  storageBucket: "cancer-monitor.appspot.com",
  messagingSenderId: "1009875960090",
  appId: "1:1009875960090:web:56f823ee1f6030ea7e2ca3",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
