import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from '@react-native-firebase/auth';
import { auth } from './firebase';
export const registerAccount = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth(), email.trim(), password);
export const login = (email: string, password: string) =>
  signInWithEmailAndPassword(auth(), email.trim(), password);
export const observeAuth = (callback: Parameters<typeof onAuthStateChanged>[1]) =>
  onAuthStateChanged(auth(), callback);
export const logout = () => signOut(auth());
