import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Map, Users, Gift, Sparkles, RotateCw, Home, ArrowLeft } from 'lucide-react';

const TagGame = () => {
  const [page, setPage] = useState('home');
  const [gameCode, setGameCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [coins, setCoins] = useState(100);
  const [activeTab, setActiveTab] = useState('map');
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelResult, setWheelResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [distance, setDistance] = useState(0);
  const [lastPosition, setLastPosition] = useState(null);
  const watchId = useRef(null);

  const generateId = () => Math.random().toString(36).substring(2, 15);
  const generateGameCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const loadGameState = useCallback(async (code) => {
    try {
      const stored = localStorage.getItem(`game:${code}`);
      if (stored) {
        const state = JSON.parse(stored);
        setGameState(state);
        const currentPlayer = state.players.find(p => p.id === playerId);
        if (currentPlayer) setCoins(currentPlayer.coins);
        return state;
      }
      return null;
    } catch (error) {
      console.log('Erreur:', error);
      return null;
    }
  }, [playerId]);

  const saveGameState = useCallback((state) => {
    try {
      localStorage.setItem(`game:${gameCode}`, JSON.stringify(state));
      setGameState(state);
    } catch (error) {
      console.error('Erreur:', error);
    }
  }, [gameCode]);

  useEffect(() => {
    if (page === 'game' && gameCode) {
      const interval = setInterval(() => {
        loadGameState(gameCode);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [page, gameCode, loadGameState]);

  const createGame = async () => {
    if (!playerName.trim()) {
      setError('Veuillez entrer votre nom');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const code = generateGameCode();
      const pId = generateId();
      const newGameState = {
        code: code,
        host: pId,
        players: [{
          id: pId,
          name: playerName,
          isChaser: false,
          coins: 100,
          distance: 0,
          x: Math.random() * 300,
          y: Math.random() * 300
        }],
        createdAt: Date.now()
      };
      
      localStorage.setItem(`game:${code}`, JSON.stringify(newGameState));
      setGameCode(code);
      setPlayerId(pId);
      setIsHost(true);
      setGameState(newGameState);
      setPage('game');
    } catch (error) {
      setError('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const joinGame = async () => {
    if (!playerName.trim() || !inputCode.trim()) {
      setError('Entrez votre nom et le code');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const code = inputCode.toUpperCase();
      const existingState = await loadGameState(code);
      
      if (!existingState) {
        setError('Partie introuvable');
        setLoading(false);
        return;
      }
      
      const pId = generateId();
      if (existingState.players.some(p => p.name === playerName)) {
        setError('Nom déjà pris');
        setLoading(false);
        return;
      }
      
      const newPlayer = {
        id: pId,
        name: playerName,
        isChaser: false,
        coins: 100,
        distance: 0,
        x: Math.random() * 300,
        y: Math.random() * 300
      };
      
      existingState.players.push(newPlayer);
      localStorage.setItem(`game:${code}`, JSON.stringify(existingState));
      
      setGameCode(code);
      setPlayerId(pId);
      setIsHost(false);
      setGameState(existingState);
      setPage('game');
    } catch (error) {
      setError('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectRandomChaser = () => {
    if (!isHost || !gameState) return;
    const updatedPlayers = gameState.players.map(p => ({ ...p, isChaser: false }));
    const randomIndex = Math.floor(Math.random() * updatedPlayers.length);
    updatedPlayers[randomIndex].isChaser = true;
    const updated = { ...gameState, players: updatedPlayers };
    localStorage.setItem(`game:${gameCode}`, JSON.stringify(updated));
    setGameState(updated);
  };

  const wheelOptions = [
    { type: 'bonus', text: '+50 pièces', value: 50 },
    { type: 'malus', text: 'Ralenti 10s', value: 'slow' },
    { type: 'bonus', text: '+100 pièces', value: 100 },
    { type: 'malus', text: 'Vision réduite', value: 'blind' },
    { type: 'bonus', text: 'Vitesse x2', value: 'speed' },
    { type: 'malus', text: '-30 pièces', value: -30 },
    { type: 'bonus', text: 'Bouclier 20s', value: 'shield' },
    { type: 'malus', text: 'Téléportation aléatoire', value: 'teleport' }
  ];

  const spinWheel = () => {
    if (wheelSpinning || !gameState) return;
    setWheelSpinning(true);
    setWheelResult(null);

    setTimeout(() => {
      const result = wheelOptions[Math.floor(Math.random() * wheelOptions.length)];
      setWheelResult(result);
      
      if (typeof result.value === 'number') {
        const newCoins = Math.max(0, coins + result.value);
        setCoins(newCoins);
        const updatedPlayers = gameState.players.map(p => 
          p.id === playerId ? { ...p, coins: newCoins } : p
        );
        const updated = { ...gameState, players: updatedPlayers };
        localStorage.setItem(`game:${gameCode}`, JSON.stringify(updated));
        setGameState(updated);
      }
      setWheelSpinning(false);
    }, 2000);
  };

  const shopItems = [
    { id: 1, name: 'Gel', description: 'Gèle un joueur pendant 15s', cost: 50, icon: '❄️' },
    { id: 2, name: 'Piège', description: 'Place un piège invisible', cost: 75, icon: '🕸️' },
    { id: 3, name: 'Vision', description: 'Révèle la position du chat', cost: 100, icon: '👁️' },
    { id: 4, name: 'Échange', description: 'Échange ta position', cost: 120, icon: '🔄' }
  ];

  const buyItem = (item) => {
    if (coins >= item.cost && gameState) {
      const newCoins = coins - item.cost;
      setCoins(newCoins);
      const updatedPlayers = gameState.players.map(p => 
        p.id === playerId ? { ...p, coins: newCoins } : p
      );
      const updated = { ...gameState, players: updatedPlayers };
      localStorage.setItem(`game:${gameCode}`, JSON.stringify(updated));
      setGameState(updated);
      alert(`Acheté: ${item.name}!`);
    } else {
      alert('Pas assez de pièces!');
    }
  };

  const leaveGame = () => {
    setPage('home');
    setGameCode('');
    setGameState(null);
    setPlayerId('');
    setIsHost(false);
  };

  const currentPlayer = gameState?.players.find(p => p.id === playerId);
  const isChaser = currentPlayer?.isChaser || false;

  if (page === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">🏃 Jeu du Chat</h1>
          <p className="text-center text-sm text-gray-500 mb-8">Multijoueur</p>
          <div className="space-y-4">
            <button onClick={() => setPage('create')} className="w-full bg-gradient-to-r from-green-400 to-green-600 text-white py-6 rounded-2xl font-bold text-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center gap-3">
              <Users size={28} /> Créer une partie
            </button>
            <button onClick={() => setPage('join')} className="w-full bg-gradient-to-r from-blue-400 to-blue-600 text-white py-6 rounded-2xl font-bold text-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center gap-3">
              <Home size={28} /> Rejoindre une partie
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (page === 'create') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <button onClick={() => setPage('home')} className="mb-4 text-gray-600 hover:text-gray-800 flex items-center gap-2">
            <ArrowLeft size={20} /> Retour
          </button>
          <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Créer une partie</h2>
          {error && <div className="bg-red-100 border-2 border-red-500 text-red-700 p-3 rounded-xl mb-4">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Votre nom</label>
              <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500" placeholder="Entrez votre nom" maxLength={20} />
            </div>
            <button onClick={createGame} disabled={loading} className="w-full bg-gradient-to-r from-green-500 to-green-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50">
              {loading ? 'Création...' : 'Créer la partie'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (page === 'join') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <button onClick={() => setPage('home')} className="mb-4 text-gray-600 hover:text-gray-800 flex items-center gap-2">
            <ArrowLeft size={20} /> Retour
          </button>
          <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Rejoindre une partie</h2>
          {error && <div className="bg-red-100 border-2 border-red-500 text-red-700 p-3 rounded-xl mb-4">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Votre nom</label>
              <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500" placeholder="Entrez votre nom" maxLength={20} />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Code de la partie</label>
              <input type="text" value={inputCode} onChange={(e) => setInputCode(e.target.value.toUpperCase())} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-center text-2xl font-mono tracking-wider" placeholder="ABC123" maxLength={6} />
            </div>
            <button onClick={joinGame} disabled={loading} className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50">
              {loading ? 'Connexion...' : 'Rejoindre'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h2 className="text-2xl font-bold">{playerName}</h2>
              <p className="text-sm opacity-90">Code: {gameCode}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">💰 {coins}</p>
              <p className="text-xs opacity-90">Pièces</p>
            </div>
            <div className="text-right ml-4">
              <p className="text-2xl font-bold">🏃 {distance.toFixed(2)} km</p>
              <p className="text-xs opacity-90">Distance</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isHost && gameState && gameState.players.length > 1 && (
              <button onClick={selectRandomChaser} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold transition-all">
                🎲 Choisir le chat
              </button>
            )}
            <button onClick={leaveGame} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-sm font-semibold transition-all">
              Quitter
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto">
          {activeTab === 'map' && (
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Carte de jeu</h3>
              {!isChaser && <div className="bg-green-100 border-2 border-green-500 rounded-xl p-4 mb-4"><p className="text-green-800 font-bold text-center text-xl">🐭 Vous n'êtes pas le chat</p></div>}
              {isChaser && <div className="bg-red-100 border-2 border-red-500 rounded-xl p-4 mb-4"><p className="text-red-800 font-bold text-center text-xl">🐱 Vous êtes le chat !</p></div>}
              <div className="bg-gradient-to-br from-green-200 to-green-400 rounded-xl h-96 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-20"><div className="grid grid-cols-8 grid-rows-8 h-full">{[...Array(64)].map((_, i) => <div key={i} className="border border-green-500"></div>)}</div></div>
                {isChaser && gameState?.players.map((player) => (
                  <div key={player.id} className="absolute transform -translate-x-1/2 -translate-y-1/2" style={{left: `${(player.x / 300) * 100}%`, top: `${(player.y / 300) * 100}%`}}>
                    <div className="text-3xl">{player.isChaser ? '🐱' : '🐭'}</div>
                    <div className="text-xs bg-white/90 px-2 py-1 rounded-full font-semibold text-center whitespace-nowrap">{player.name}</div>
                  </div>
                ))}
                {!isChaser && currentPlayer && (
                  <div className="absolute transform -translate-x-1/2 -translate-y-1/2" style={{left: `${(currentPlayer.x / 300) * 100}%`, top: `${(currentPlayer.y / 300) * 100}%`}}>
                    <div className="text-3xl">🐭</div>
                    <div className="text-xs bg-white/90 px-2 py-1 rounded-full font-semibold text-center whitespace-nowrap">Vous</div>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <h4 className="font-bold text-lg mb-2">Joueurs ({gameState?.players.length || 0})</h4>
                <div className="grid grid-cols-2 gap-2">
                  {gameState?.players.map((player) => (
                    <div key={player.id} className={`rounded-lg p-3 ${player.id === playerId ? 'bg-purple-100 border-2 border-purple-500' : 'bg-gray-100'}`}>
                      <p className="font-semibold">{player.name}</p>
                      <p className="text-xs text-gray-500">{player.isChaser ? '🐱 Chat' : '🐭 Souris'} • 💰 {player.coins} • 🏃 {(player.distance || 0).toFixed(2)} km</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'wheel' && (
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Roue de la chance</h3>
              <div className="flex flex-col items-center">
                <div className={`w-64 h-64 rounded-full bg-gradient-to-br from-yellow-400 via-orange-400 to-red-400 flex items-center justify-center shadow-2xl mb-6 ${wheelSpinning ? 'animate-spin' : ''}`}>
                  <div className="w-56 h-56 rounded-full bg-white flex items-center justify-center"><Sparkles size={80} className="text-yellow-500" /></div>
                </div>
                {wheelResult && (
                  <div className={`mb-6 p-4 rounded-xl ${wheelResult.type === 'bonus' ? 'bg-green-100 border-2 border-green-500' : 'bg-red-100 border-2 border-red-500'}`}>
                    <p className={`text-xl font-bold text-center ${wheelResult.type === 'bonus' ? 'text-green-800' : 'text-red-800'}`}>{wheelResult.text}</p>
                  </div>
                )}
                <button onClick={spinWheel} disabled={wheelSpinning} className={`px-8 py-4 rounded-xl font-bold text-xl shadow-lg transform transition-all ${wheelSpinning ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:scale-105 text-white'}`}>
                  {wheelSpinning ? 'Rotation...' : 'Tourner la roue'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'shop' && (
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Boutique</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shopItems.map(item => (
                  <div key={item.id} className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl p-4 border-2 border-purple-300">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-4xl">{item.icon}</span>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg">{item.name}</h4>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xl font-bold text-purple-700">💰 {item.cost}</span>
                      <button onClick={() => buyItem(item)} disabled={coins < item.cost} className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        Acheter
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border-t-2 border-gray-200 p-2 shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-around">
          <button onClick={() => setActiveTab('map')} className={`flex flex-col items-center p-3 rounded-xl transition-all ${activeTab === 'map' ? 'bg-purple-100 text-purple-600' : 'text-gray-500'}`}>
            <Map size={28} />
            <span className="text-xs mt-1 font-semibold">Carte</span>
          </button>
          <button onClick={() => setActiveTab('wheel')} className={`flex flex-col items-center p-3 rounded-xl transition-all ${activeTab === 'wheel' ? 'bg-purple-100 text-purple-600' : 'text-gray-500'}`}>
            <RotateCw size={28} />
            <span className="text-xs mt-1 font-semibold">Roue</span>
          </button>
          <button onClick={() => setActiveTab('shop')} className={`flex flex-col items-center p-3 rounded-xl transition-all ${activeTab === 'shop' ? 'bg-purple-100 text-purple-600' : 'text-gray-500'}`}>
            <Gift size={28} />
            <span className="text-xs mt-1 font-semibold">Boutique</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TagGame;
