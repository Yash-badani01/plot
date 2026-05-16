import React, { useState, useRef, useEffect } from 'react';
import { RotateCcw, Volume2, VolumeX, Zap, Trophy } from 'lucide-react';
import './Connect4.css';

const Connect4 = () => {
  const ROWS = 6;
  const COLS = 7;
  const [board, setBoard] = useState(Array(ROWS * COLS).fill(null));
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [gameMessage, setGameMessage] = useState('Your turn');
  const [winningIndices, setWinningIndices] = useState([]);
  const [droppingPiece, setDroppingPiece] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [stats, setStats] = useState({ wins: 0, losses: 0, ties: 0 });
  const audioContextRef = useRef(null);

  useEffect(() => {
    const savedStats = localStorage.getItem('connect4_stats');
    if (savedStats) setStats(JSON.parse(savedStats));
  }, []);

  useEffect(() => {
    localStorage.setItem('connect4_stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {}
    }
  }, []);

  const playSound = (frequency, duration) => {
    if (!soundEnabled || !audioContextRef.current) return;
    try {
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  };

  const soundDrop = () => playSound(400, 0.2);
  const soundWin = () => {
    playSound(523, 0.15);
    setTimeout(() => playSound(659, 0.15), 100);
    setTimeout(() => playSound(784, 0.3), 200);
  };

  const getValidColumns = (boardState) => {
    const valid = [];
    for (let col = 0; col < COLS; col++) {
      if (!boardState[col]) valid.push(col);
    }
    return valid;
  };

  const checkWinner = (boardState) => {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS - 3; col++) {
        const idx = row * COLS + col;
        if (boardState[idx] && boardState[idx] === boardState[idx + 1] && 
            boardState[idx] === boardState[idx + 2] && boardState[idx] === boardState[idx + 3]) {
          return { winner: boardState[idx], indices: [idx, idx + 1, idx + 2, idx + 3] };
        }
      }
    }

    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS - 3; row++) {
        const idx = row * COLS + col;
        if (boardState[idx] && boardState[idx] === boardState[idx + COLS] && 
            boardState[idx] === boardState[idx + COLS * 2] && boardState[idx] === boardState[idx + COLS * 3]) {
          return { winner: boardState[idx], indices: [idx, idx + COLS, idx + COLS * 2, idx + COLS * 3] };
        }
      }
    }

    for (let row = 0; row < ROWS - 3; row++) {
      for (let col = 0; col < COLS - 3; col++) {
        const idx = row * COLS + col;
        if (boardState[idx] && boardState[idx] === boardState[idx + COLS + 1] && 
            boardState[idx] === boardState[idx + (COLS + 1) * 2] && boardState[idx] === boardState[idx + (COLS + 1) * 3]) {
          return { winner: boardState[idx], indices: [idx, idx + COLS + 1, idx + (COLS + 1) * 2, idx + (COLS + 1) * 3] };
        }
      }
    }

    for (let row = 3; row < ROWS; row++) {
      for (let col = 0; col < COLS - 3; col++) {
        const idx = row * COLS + col;
        if (boardState[idx] && boardState[idx] === boardState[idx - COLS + 1] && 
            boardState[idx] === boardState[idx - (COLS - 1) * 2] && boardState[idx] === boardState[idx - (COLS - 1) * 3]) {
          return { winner: boardState[idx], indices: [idx, idx - COLS + 1, idx - (COLS - 1) * 2, idx - (COLS - 1) * 3] };
        }
      }
    }

    return { winner: null, indices: [] };
  };

  const placePiece = (col, piece, boardState) => {
    const newBoard = [...boardState];
    for (let row = ROWS - 1; row >= 0; row--) {
      const idx = row * COLS + col;
      if (!newBoard[idx]) {
        newBoard[idx] = piece;
        return { board: newBoard, row };
      }
    }
    return { board: null, row: null };
  };

  const evaluateBoard = (boardState) => {
    const { winner } = checkWinner(boardState);
    if (winner === 'magic') return 1000000;
    if (winner === 'player') return -1000000;
    let score = 0;

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const idx = row * COLS + col;
        if (col <= COLS - 4) {
          const line = [boardState[idx], boardState[idx + 1], boardState[idx + 2], boardState[idx + 3]];
          const magics = line.filter(x => x === 'magic').length;
          const players = line.filter(x => x === 'player').length;
          const empty = 4 - magics - players;
          if (magics === 3 && empty === 1) score += 50000;
          if (players === 3 && empty === 1) score -= 50000;
          if (magics > 0 && players === 0) score += Math.pow(magics, 3) * 100;
          if (players > 0 && magics === 0) score -= Math.pow(players, 3) * 100;
        }
      }
    }
    return score;
  };

  const minimax = (boardState, depth, isMaximizing, alpha = -Infinity, beta = Infinity) => {
    const { winner } = checkWinner(boardState);
    if (winner === 'magic') return 1000000 + depth;
    if (winner === 'player') return -1000000 - depth;

    const validMoves = getValidColumns(boardState);
    if (validMoves.length === 0) return 0;
    if (depth === 0) return evaluateBoard(boardState);

    const sortedMoves = validMoves.sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3));

    if (isMaximizing) {
      let maxScore = -Infinity;
      for (let col of sortedMoves) {
        const result = placePiece(col, 'magic', boardState);
        if (result.board) {
          const score = minimax(result.board, depth - 1, false, alpha, beta);
          maxScore = Math.max(maxScore, score);
          alpha = Math.max(alpha, score);
          if (beta <= alpha) break;
        }
      }
      return maxScore;
    } else {
      let minScore = Infinity;
      for (let col of sortedMoves) {
        const result = placePiece(col, 'player', boardState);
        if (result.board) {
          const score = minimax(result.board, depth - 1, true, alpha, beta);
          minScore = Math.min(minScore, score);
          beta = Math.min(beta, score);
          if (beta <= alpha) break;
        }
      }
      return minScore;
    }
  };

  const getBestMove = (boardState) => {
    const validMoves = getValidColumns(boardState);
    let bestCol = validMoves[0];
    let bestScore = -Infinity;

    for (let col of validMoves) {
      const result = placePiece(col, 'magic', boardState);
      if (result.board) {
        const score = minimax(result.board, 7, false, -Infinity, Infinity);
        if (score > bestScore) {
          bestScore = score;
          bestCol = col;
        }
      }
    }
    return bestCol;
  };

  const makeMagicMove = (currentBoard) => {
    setIsAIThinking(true);

    setTimeout(() => {
      const col = getBestMove(currentBoard);
      let landingRow = ROWS - 1;
      for (let row = ROWS - 1; row >= 0; row--) {
        const idx = row * COLS + col;
        if (!currentBoard[idx]) {
          landingRow = row;
          break;
        }
      }
      
      setDroppingPiece({ col, row: landingRow, piece: 'magic' });
      soundDrop();

      setTimeout(() => {
        const result = placePiece(col, 'magic', currentBoard);
        if (result.board) setBoard(result.board);
        setDroppingPiece(null);

        const { winner: magicWinner, indices: winIndices } = checkWinner(result.board);

        if (magicWinner === 'magic') {
          soundWin();
          setTimeout(() => {
            setWinningIndices(winIndices);
            setWinner('magic');
            setGameOver(true);
            setGameMessage('🤖 Mavic wins!');
            setStats(prev => ({ ...prev, losses: prev.losses + 1 }));
          }, 300);
        } else if (getValidColumns(result.board).length === 0) {
          setGameOver(true);
          setGameMessage("It's a tie!");
          setStats(prev => ({ ...prev, ties: prev.ties + 1 }));
        } else {
          setGameMessage('Your turn');
        }
        setIsAIThinking(false);
      }, 500);
    }, 300);
  };

  const handleColumnClick = (col) => {
    if (gameOver || isAIThinking || droppingPiece) return;

    const validCols = getValidColumns(board);
    if (!validCols.includes(col)) return;

    let landingRow = ROWS - 1;
    for (let row = ROWS - 1; row >= 0; row--) {
      const idx = row * COLS + col;
      if (!board[idx]) {
        landingRow = row;
        break;
      }
    }

    setDroppingPiece({ col, row: landingRow, piece: 'player' });
    soundDrop();

    setTimeout(() => {
      const result = placePiece(col, 'player', board);
      setBoard(result.board);
      setDroppingPiece(null);

      const { winner: playerWinner, indices: winIndices } = checkWinner(result.board);

      if (playerWinner === 'player') {
        soundWin();
        setTimeout(() => {
          setWinningIndices(winIndices);
          setWinner('player');
          setGameOver(true);
          setGameMessage('🎉 You win!');
          setStats(prev => ({ ...prev, wins: prev.wins + 1 }));
        }, 300);
        return;
      }

      if (getValidColumns(result.board).length === 0) {
        setGameOver(true);
        setGameMessage("It's a tie!");
        setStats(prev => ({ ...prev, ties: prev.ties + 1 }));
        return;
      }

      setGameMessage('🤖 Mavic is thinking...');
      makeMagicMove(result.board);
    }, 500);
  };

  const resetGame = () => {
    setBoard(Array(ROWS * COLS).fill(null));
    setGameOver(false);
    setWinner(null);
    setWinningIndices([]);
    setGameMessage('Your turn');
    setIsAIThinking(false);
    setDroppingPiece(null);
  };

  const clearStats = () => {
    setStats({ wins: 0, losses: 0, ties: 0 });
  };

  return (
    <div className="connect4-container">
      <div className="header">
        <div className="title-wrapper">
          <Zap size={32} />
          <h1 className="title">CONNECT 4</h1>
          <Zap size={32} />
        </div>
        <p className="subtitle">vs mavic opponent</p>
      </div>

      <div className="stats-grid">
        <div className="stat-box wins">
          <div className="stat-label">Wins</div>
          <div className="stat-number">{stats.wins}</div>
        </div>
        <div className="stat-box losses">
          <div className="stat-label">Losses</div>
          <div className="stat-number">{stats.losses}</div>
        </div>
        <div className="stat-box ties">
          <div className="stat-label">Ties</div>
          <div className="stat-number">{stats.ties}</div>
        </div>
      </div>

      <div className="controls-top">
        <button onClick={() => setSoundEnabled(!soundEnabled)} className="btn-sound" title={soundEnabled ? 'Mute' : 'Unmute'}>
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
        <button onClick={clearStats} className="reset-stats-btn">Reset Stats</button>
      </div>

      <div className={`status ${gameMessage.includes('🤖') && gameMessage.includes('wins') ? 'mavic-win' : gameMessage.includes('🎉') ? 'player-win' : gameMessage.includes("It's a") ? 'tie' : gameMessage.includes('thinking') ? 'thinking' : 'normal'}`}>
        <p className="status-text">{gameMessage}</p>
      </div>

      <div className="board">
        <div className="board-grid">
          {Array.from({ length: ROWS * COLS }).map((_, idx) => {
            const piece = board[idx];
            const col = idx % COLS;
            const row = Math.floor(idx / COLS);
            const isWinning = winningIndices.includes(idx);
            const isDropping = droppingPiece && droppingPiece.col === col && droppingPiece.row === row;

            return (
              <button key={idx} onClick={() => handleColumnClick(col)} disabled={gameOver || isAIThinking || droppingPiece} className={`cell ${isWinning ? 'winning' : ''}`}>
                {piece && <div className={`piece ${piece === 'player' ? 'yellow' : 'red'} ${isWinning ? 'winner' : ''}`} />}
                {isDropping && <div className={`piece ${droppingPiece.piece === 'player' ? 'yellow' : 'red'} falling`} />}
                {!piece && !gameOver && !isAIThinking && !droppingPiece && <div className="hover-indicator" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="buttons-group">
        <button onClick={resetGame} className="btn-primary">
          <RotateCcw size={20} />
          New Game
        </button>
        <button onClick={clearStats} className="btn-secondary">
          <Trophy size={20} />
          Clear Stats
        </button>
      </div>

      <div className="legend">
        <div className="legend-item">
          <div className="legend-piece yellow"></div>
          <span>You</span>
        </div>
        <div className="legend-item">
          <div className="legend-piece red"></div>
          <span>Mavic</span>
        </div>
      </div>
    </div>
  );
};

export default Connect4;
