
import { Component, ChangeDetectionStrategy, signal, computed, effect, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService, RoomState, Player, Answers } from './services/firebase.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule]
})
export class AppComponent implements OnInit {
  private firebaseService = inject(FirebaseService);

  roomCode = signal<string>('');
  playerId = signal<string>('');
  username = signal<string>('');
  
  roomState = signal<RoomState | null>(null);

  // Local state for current player's answers before submission
  answers = signal<Answers>({ city: '', name: '', food: '', movie: '' });
  
  // Local state for score inputs
  scorePlayer1 = signal<number>(0);
  scorePlayer2 = signal<number>(0);
  
  validationError = signal<string>('');

  // --- Computed Signals for derived state ---
  phase = computed(() => this.roomState()?.phase ?? 'lobby');
  players = computed(() => this.roomState()?.players ?? {});
  playerList = computed(() => Object.values(this.players()));
  currentPlayer = computed(() => this.players()[this.playerId()] ?? null);
  canStartGame = computed(() => this.playerList().length === 2 && this.roomState()?.phase === 'lobby');
  gameLetter = computed(() => this.roomState()?.letter ?? '');

  constructor() {
    // Effect to handle URL updates when roomCode changes
    effect(() => {
      const code = this.roomCode();
      if (code && typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (url.searchParams.get('room') !== code) {
          url.searchParams.set('room', code);
          window.history.replaceState({}, '', url.toString());
        }
      }
    });
  }

  ngOnInit(): void {
    this.initializeGame();
  }

  private initializeGame(): void {
    let code = new URLSearchParams(window.location.search).get('room');
    if (!code) {
      code = this.generateRoomCode();
    }
    this.roomCode.set(code);

    let pid = localStorage.getItem('playerId-' + code);
    if (!pid) {
      pid = `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem('playerId-' + code, pid);
    }
    this.playerId.set(pid);

    this.firebaseService.listenToRoom(code, (state) => {
      this.roomState.set(state);
      if (state?.scores) {
          const players = Object.keys(state.players);
          if (players.length === 2) {
              this.scorePlayer1.set(state.scores[players[0]] ?? 0);
              this.scorePlayer2.set(state.scores[players[1]] ?? 0);
          }
      }
    });
  }

  private generateRoomCode(): string {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
  }

  joinGame(): void {
    if (!this.username().trim()) {
      alert('Please enter a username.');
      return;
    }
    if (this.playerList().length >= 2 && !this.currentPlayer()) {
        alert('This room is full.');
        return;
    }

    const newPlayer: Player = {
      id: this.playerId(),
      name: this.username(),
      answers: { city: '', name: '', food: '', movie: '' },
    };
    
    this.firebaseService.updateRoom(this.roomCode(), {
        [`players/${this.playerId()}`]: newPlayer
    });
  }

  startGame(): void {
    if (!this.canStartGame()) return;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
    this.firebaseService.updateRoom(this.roomCode(), {
      phase: 'playing',
      letter: randomLetter,
    });
  }

  submitAnswers(): void {
    const letter = this.gameLetter().toLowerCase();
    const currentAnswers = this.answers();
    this.validationError.set('');

    for (const key of Object.keys(currentAnswers) as Array<keyof Answers>) {
      if (!currentAnswers[key] || currentAnswers[key].trim().toLowerCase().charAt(0) !== letter) {
        this.validationError.set(`All words must start with the letter '${letter.toUpperCase()}'. Check your answer for '${key}'.`);
        return;
      }
    }
    
    // Lock answers and end the game for everyone
    this.firebaseService.updateRoom(this.roomCode(), {
      [`players/${this.playerId()}/answers`]: currentAnswers,
      phase: 'results',
    });
  }

  saveScores(): void {
      const players = this.playerList();
      if (players.length !== 2) return;
      
      const scores: { [key: string]: number } = {};
      scores[players[0].id] = this.scorePlayer1();
      scores[players[1].id] = this.scorePlayer2();
      
      this.firebaseService.updateRoom(this.roomCode(), { scores });
  }

  copyRoomCode(): void {
    navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Room link copied to clipboard!');
    });
  }
}
