
import { Injectable } from '@angular/core';

// This allows us to use the globally available 'firebase' object from the CDN script.
declare var firebase: any;

// --- Type Definitions ---
export interface Answers {
  city: string;
  name: string;
  food: string;
  movie: string;
}

export interface Player {
  id: string;
  name: string;
  answers: Answers;
}

export interface RoomState {
  phase: 'lobby' | 'playing' | 'results';
  players: { [key: string]: Player };
  letter?: string;
  scores?: { [key: string]: number };
}


@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private database: any;

  // IMPORTANT: Replace this with your actual Firebase config
  private firebaseConfig = {
    apiKey: "FIREBASE_CONFIG_HERE_apiKey",
    authDomain: "FIREBASE_CONFIG_HERE_authDomain",
    databaseURL: "FIREBASE_CONFIG_HERE_databaseURL",
    projectId: "FIREBASE_CONFIG_HERE_projectId",
    storageBucket: "FIREBASE_CONFIG_HERE_storageBucket",
    messagingSenderId: "FIREBASE_CONFIG_HERE_messagingSenderId",
    appId: "FIREBASE_CONFIG_HERE_appId"
  };

  constructor() {
    if (!firebase.apps.length) {
      firebase.initializeApp(this.firebaseConfig);
    }
    this.database = firebase.database();
  }

  private getRoomRef(roomCode: string) {
    return this.database.ref('rooms/' + roomCode);
  }

  listenToRoom(roomCode: string, callback: (state: RoomState | null) => void): void {
    const roomRef = this.getRoomRef(roomCode);
    roomRef.on('value', (snapshot: any) => {
      const state = snapshot.val() as RoomState;
      // Initialize room if it doesn't exist
      if (!state) {
        const initialState: RoomState = {
            phase: 'lobby',
            players: {}
        };
        roomRef.set(initialState).then(() => {
            callback(initialState);
        });
      } else {
        callback(state);
      }
    });
  }

  updateRoom(roomCode: string, updates: Partial<RoomState>): Promise<void> {
    return this.getRoomRef(roomCode).update(updates);
  }
}
