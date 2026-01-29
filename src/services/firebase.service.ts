
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
     apiKey: "AIzaSyAGedkjaQHeNOqZj97QsA1JPJggmCWR2XI",
  authDomain: "game-7d774.firebaseapp.com",
  projectId: "game-7d774",
  storageBucket: "game-7d774.firebasestorage.app",
  messagingSenderId: "1027421064147",
  appId: "1:1027421064147:web:41b10454d0f6091ac0fd26",
  measurementId: "G-EHBT1RKZV0"
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
