const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { db, erasDb } = require('./db');

// Load market news
const marketNewsPath = path.join(__dirname, 'data', 'market_news.json');
let marketNews = [];
try {
  marketNews = JSON.parse(fs.readFileSync(marketNewsPath, 'utf8'));
} catch (e) {
  console.log("No market_news.json found, special tiles will have no effect.");
}


const app = express();
app.use(cors());

// Serve the React frontend static files
const clientBuildPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));

// Fallback to React router for all other requests
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/socket.io')) {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  } else {
    next();
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // allow all in dev
    methods: ["GET", "POST"]
  }
});

// Helpers
const shuffle = (array) => {
    let curr = array.length, random;
    while (curr != 0) {
        random = Math.floor(Math.random() * curr);
        curr--;
        [array[curr], array[random]] = [array[random], array[curr]];
    }
    return array;
};

const logTransaction = (teamId, roomId, actionType, amount, details) => {
  db.prepare('INSERT INTO transactions (teamId, roomId, actionType, amount, details) VALUES (?, ?, ?, ?, ?)').run(teamId, roomId, actionType, amount, details);
};

const getGlobalState = () => {
  const stateRow = db.prepare('SELECT * FROM app_state WHERE id = 1').get();
  const teamsRows = db.prepare('SELECT * FROM teams').all();
  const roomsRows = db.prepare('SELECT * FROM rooms').all();
  
  const roomsObj = {};
  for (const r of roomsRows) {
    roomsObj[r.id] = {
      deck: JSON.parse(r.deck),
      turnIndex: r.turnIndex,
      lapTeamsFinished: r.lapTeamsFinished,
      roundEnding: !!r.roundEnding,
      eraStatus: r.eraStatus || 'ACTIVE'
    };
  }
  
  const transactions = db.prepare('SELECT * FROM transactions ORDER BY timestamp DESC LIMIT 100').all();
  
  return {
    currentEraId: stateRow.currentEraId,
    currentEraName: stateRow.currentEraName,
    teams: teamsRows,
    rooms: roomsObj,
    transactions
  };
};

const initializeRoomDeck = (roomId) => {
    const state = db.prepare('SELECT currentEraId FROM app_state WHERE id = 1').get();
    const era = erasDb.find(e => e.id === state.currentEraId);
    let deck = [];
    if (era) {
        deck = JSON.parse(JSON.stringify(era.investments));
        deck = shuffle(deck);
    }
    
    db.prepare(`
      INSERT INTO rooms (id, deck, turnIndex, lapTeamsFinished) 
      VALUES (?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET deck=excluded.deck, turnIndex=0, lapTeamsFinished=0
    `).run(roomId, JSON.stringify(deck));
};

io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);

  socket.emit('stateUpdate', getGlobalState());

  // Moderator actions
  socket.on('joinRoom', (roomId) => {
      socket.join(roomId);
      const room = db.prepare('SELECT id FROM rooms WHERE id = ?').get(roomId);
      if (!room) {
          initializeRoomDeck(roomId);
      }
      socket.emit('stateUpdate', getGlobalState());
  });

  socket.on('registerTeam', ({ name, room, startingCash }) => {
      const id = crypto.randomUUID();
      db.prepare(`
        INSERT INTO teams (id, name, room, cash, lapTurnsTaken, position, eraStartingCash)
        VALUES (?, ?, ?, ?, 0, 0, ?)
      `).run(id, name, room, startingCash || 2000, startingCash || 2000);
      logTransaction(id, room, 'REGISTER', startingCash || 2000, `Team registered with $${startingCash || 2000}`);
      io.emit('stateUpdate', getGlobalState());
  });

  socket.on('removeTeam', (teamId) => {
      db.prepare('DELETE FROM teams WHERE id = ?').run(teamId);
      io.emit('stateUpdate', getGlobalState());
  });

  socket.on('forceNextTurn', (roomId) => {
      const roomRow = db.prepare('SELECT turnIndex FROM rooms WHERE id = ?').get(roomId);
      if (roomRow) {
          const teamsInRoom = db.prepare('SELECT COUNT(*) as count FROM teams WHERE room = ?').get(roomId).count;
          let newTurnIndex = (roomRow.turnIndex + 1) % Math.max(1, teamsInRoom);
          db.prepare('UPDATE rooms SET turnIndex = ? WHERE id = ?').run(newTurnIndex, roomId);
          io.emit('stateUpdate', getGlobalState());
      }
  });

  socket.on('drawInvestments', ({ roomId, teamId }, callback) => {
      const roomRow = db.prepare('SELECT deck FROM rooms WHERE id = ?').get(roomId);
      if (!roomRow) return;
      let deck = JSON.parse(roomRow.deck);
      if (deck.length < 3) {
          return callback({ error: 'Not enough cards in deck. Era change needed.' });
      }
      
      const team = teamId ? db.prepare('SELECT insiderInfo, sabotaged, monopolyPower FROM teams WHERE id = ?').get(teamId) : null;
      let cardsToDraw = (team && team.monopolyPower) ? 5 : 3;

      let drawn = [];
      let goodCount = 0;
      let badCount = 0;
      
      for (let i = 0; i < cardsToDraw; i++) {
          let idxToPick = 0;
          if (team && team.insiderInfo) {
              idxToPick = deck.findIndex(c => c.type === 'Good');
              if (idxToPick === -1) idxToPick = deck.findIndex(c => c.type === 'Bad');
          } else if (team && team.sabotaged) {
              idxToPick = deck.findIndex(c => c.type === 'Bad');
              if (idxToPick === -1) idxToPick = deck.findIndex(c => c.type === 'Good');
          } else {
              if (drawn.length >= 2) {
                 if (goodCount >= 2) {
                     idxToPick = deck.findIndex(c => c.type === 'Bad');
                 } else if (badCount >= 2) {
                     idxToPick = deck.findIndex(c => c.type === 'Good');
                 }
              }
          }
          if (idxToPick === -1) idxToPick = 0; 
          
          const card = deck.splice(idxToPick, 1)[0];
          drawn.push(card);
          if (card.type === 'Good') goodCount++;
          else badCount++;
      }
      
      db.prepare('UPDATE rooms SET deck = ? WHERE id = ?').run(JSON.stringify(deck), roomId);
      
      callback({ cards: drawn });
      io.emit('stateUpdate', getGlobalState());
  });

  socket.on('processInvestment', ({ teamId, betAmount, percentage, unselectedCards }) => {
      const team = db.prepare('SELECT room, cash, lapTurnsTaken, nextMultiplier, hedgeFund, blindFaith, bigShort FROM teams WHERE id = ?').get(teamId);
      if (team) {
          let actualPercentage = percentage;
          if (team.bigShort) actualPercentage = -actualPercentage;
          if (team.blindFaith && actualPercentage > 0) actualPercentage *= 2;
          
          let profitLoss = Math.floor(betAmount * (actualPercentage / 100));
          profitLoss *= team.nextMultiplier;
          
          if (team.hedgeFund && profitLoss < 0) {
              profitLoss = 0;
          }
          
          if (unselectedCards && unselectedCards.length > 0) {
              db.prepare(`UPDATE teams SET 
                cash = cash + ?, 
                lapTurnsTaken = lapTurnsTaken + 1,
                nextMultiplier = 1,
                hedgeFund = 0,
                insiderInfo = 0,
                blindFaith = 0,
                bigShort = 0,
                monopolyPower = 0,
                sabotaged = 0,
                frozen = 0,
                immune = 0
                WHERE id = ?`).run(profitLoss, teamId);
          } else {
              db.prepare(`UPDATE teams SET cash = cash + ?, lapTurnsTaken = lapTurnsTaken + 1, frozen = 0, immune = 0 WHERE id = ?`).run(profitLoss, teamId);
          }
          const roomRow = db.prepare('SELECT deck, turnIndex FROM rooms WHERE id = ?').get(team.room);
          if (roomRow) {
            const teamsInRoom = db.prepare('SELECT COUNT(*) as count FROM teams WHERE room = ?').get(team.room).count;
            let newTurnIndex = (roomRow.turnIndex + 1) % Math.max(1, teamsInRoom);
            
            let deck = JSON.parse(roomRow.deck);
            if (unselectedCards && unselectedCards.length > 0) {
                deck.push(...unselectedCards);
                deck = shuffle(deck);
            }
            
            db.prepare('UPDATE rooms SET deck = ?, turnIndex = ? WHERE id = ?').run(JSON.stringify(deck), newTurnIndex, team.room);
            
            if (betAmount > 0) {
              logTransaction(teamId, team.room, 'INVESTMENT', profitLoss, `Bet $${betAmount} at ${percentage > 0 ? '+' : ''}${percentage}%`);
            }

            // Check if round is ending and we just wrapped around the turn index back to 0
            if (roomRow.roundEnding && newTurnIndex === 0) {
                db.prepare("UPDATE rooms SET eraStatus = 'INTERMISSION', roundEnding = 0 WHERE id = ?").run(team.room);
            }
          }

          
          io.emit('stateUpdate', getGlobalState());
      }
  });

  socket.on('movePiece', ({ teamId, steps }, callback) => {
      const team = db.prepare('SELECT position, cash, room FROM teams WHERE id = ?').get(teamId);
      if (!team) {
          if (callback) callback({});
          return;
      }

      const oldPosition = team.position;
      let newPosition = oldPosition + steps;
      let newCash = team.cash;
      
      if (newPosition >= 40) {
          newPosition = newPosition % 40;
          newCash += 200; // Pass START
          logTransaction(teamId, team.room, 'START_BONUS', 200, 'Passed START');
          db.prepare('UPDATE rooms SET roundEnding = 1 WHERE id = ?').run(team.room);
      }

      let specialEvent = null;
      let newsCard = null;
      if (newPosition === 10) {
          specialEvent = 'ANGEL_INVESTMENT';
      } else if (newPosition === 20) {
          specialEvent = 'WHITE_COLLAR_PRISON'; 
      } else if (newPosition === 30) {
          specialEvent = 'CORPORATE_BUYOUT';
      } else if (newPosition === 0 && oldPosition !== 0) {
          newCash += 200;
          specialEvent = 'START_BONUS';
          logTransaction(teamId, team.room, 'START_BONUS', 200, 'Landed on START');
      } else if ([2, 7, 17, 22, 33, 36].includes(newPosition)) {
          if (marketNews.length > 0) {
             specialEvent = 'MARKET_NEWS';
             newsCard = marketNews[Math.floor(Math.random() * marketNews.length)];
             // Effects are resolved via a separate socket event to allow moderator input
          }
      }
      
      db.prepare('UPDATE teams SET position = ?, cash = ? WHERE id = ?').run(newPosition, newCash, teamId);
      
      io.emit('stateUpdate', getGlobalState());
      if (callback) callback({ position: newPosition, specialEvent, newsCard });
  });

  socket.on('resolveMarketNews', ({ teamId, roomId, newsCard, targetTeamId, coinTossResult }) => {
      const team = db.prepare('SELECT name, cash FROM teams WHERE id = ?').get(teamId);
      if (!team) return;
      
      const allTeams = db.prepare('SELECT id, name, cash FROM teams WHERE room = ? ORDER BY cash DESC').all(roomId);
      if (allTeams.length === 0) return;
      
      const firstPlace = allTeams[0];
      const lastPlace = allTeams[allTeams.length - 1];

      let description = newsCard.title;

      switch(newsCard.effect) {
          case 'MULTIPLIER':
              db.prepare('UPDATE teams SET nextMultiplier = ? WHERE id = ?').run(newsCard.value, teamId);
              break;
          case 'HEDGE_FUND':
              db.prepare('UPDATE teams SET hedgeFund = 1 WHERE id = ?').run(teamId);
              break;
          case 'INSIDER_INFO':
              db.prepare('UPDATE teams SET insiderInfo = 1 WHERE id = ?').run(teamId);
              break;
          case 'BLIND_FAITH':
              db.prepare('UPDATE teams SET blindFaith = 1 WHERE id = ?').run(teamId);
              break;
          case 'BIG_SHORT':
              db.prepare('UPDATE teams SET bigShort = 1 WHERE id = ?').run(teamId);
              break;
          case 'MONOPOLY_POWER':
              db.prepare('UPDATE teams SET monopolyPower = 1 WHERE id = ?').run(teamId);
              break;
          case 'FREEZE':
              if (targetTeamId) db.prepare('UPDATE teams SET frozen = 1 WHERE id = ?').run(targetTeamId);
              break;
          case 'SABOTAGE':
              if (targetTeamId) db.prepare('UPDATE teams SET sabotaged = 1 WHERE id = ?').run(targetTeamId);
              break;
          case 'WEALTH_TAX':
              const taxFirst = db.prepare('SELECT immune FROM teams WHERE id = ?').get(firstPlace.id);
              if (!taxFirst || !taxFirst.immune) {
                  const tax = Math.floor(firstPlace.cash * 0.20);
                  db.prepare('UPDATE teams SET cash = cash - ? WHERE id = ?').run(tax, firstPlace.id);
                  logTransaction(firstPlace.id, roomId, 'WEALTH_TAX', -tax, 'Wealth Tax');
              }
              break;
          case 'STIMULUS':
              const stimulus = Math.floor(firstPlace.cash * 0.20);
              db.prepare('UPDATE teams SET cash = cash + ? WHERE room = ? AND id != ?').run(stimulus, roomId, firstPlace.id);
              logTransaction(teamId, roomId, 'STIMULUS', stimulus, 'Stimulus Checks');
              break;
          case 'EMBEZZLE':
              const embezzledFirst = db.prepare('SELECT immune FROM teams WHERE id = ?').get(firstPlace.id);
              if (!embezzledFirst || !embezzledFirst.immune) {
                  const stolen = Math.floor(firstPlace.cash * 0.20);
                  db.prepare('UPDATE teams SET cash = cash - ? WHERE id = ?').run(stolen, firstPlace.id);
                  db.prepare('UPDATE teams SET cash = cash + ? WHERE id = ?').run(stolen, teamId);
                  logTransaction(teamId, roomId, 'EMBEZZLE', stolen, 'Embezzlement');
              }
              break;
          case 'PHILANTHROPY':
              if (teamId !== lastPlace.id) {
                  const donation = Math.floor(team.cash * 0.25);
                  db.prepare('UPDATE teams SET cash = cash - ? WHERE id = ?').run(donation, teamId);
                  db.prepare('UPDATE teams SET cash = cash + ? WHERE id = ?').run(donation, lastPlace.id);
                  logTransaction(teamId, roomId, 'PHILANTHROPY', -donation, 'Donated to last place');
              } else {
                  let totalBailout = 0;
                  allTeams.forEach(t => {
                      if (t.id !== teamId) {
                          const tRow = db.prepare('SELECT immune FROM teams WHERE id = ?').get(t.id);
                          if (!tRow || !tRow.immune) {
                              const amt = Math.floor(t.cash * 0.067);
                              db.prepare('UPDATE teams SET cash = cash - ? WHERE id = ?').run(amt, t.id);
                              totalBailout += amt;
                          }
                      }
                  });
                  db.prepare('UPDATE teams SET cash = cash + ? WHERE id = ?').run(totalBailout, teamId);
                  logTransaction(teamId, roomId, 'PHILANTHROPY_BAILOUT', totalBailout, 'Received bailout from all teams');
              }
              break;
          case 'AUDIT':
              const auditAmt = Math.floor(team.cash * 0.30);
              if (coinTossResult === 'HEADS') {
                  db.prepare('UPDATE teams SET cash = cash + ? WHERE id = ?').run(auditAmt, teamId);
                  logTransaction(teamId, roomId, 'AUDIT_WIN', auditAmt, 'Passed Audit');
              } else {
                  db.prepare('UPDATE teams SET cash = cash - ? WHERE id = ?').run(auditAmt, teamId);
                  logTransaction(teamId, roomId, 'AUDIT_LOSS', -auditAmt, 'Failed Audit');
              }
              break;
          case 'BAILOUT':
              if (team.cash < 2000) {
                  db.prepare('UPDATE teams SET cash = 2000 WHERE id = ?').run(teamId);
                  logTransaction(teamId, roomId, 'BAILOUT', 2000 - team.cash, 'Bailout to $2000');
              }
              break;
          case 'HOSTILE_BID':
              if (targetTeamId && coinTossResult === 'WIN') {
                  const target = db.prepare('SELECT cash FROM teams WHERE id = ?').get(targetTeamId);
                  if (target) {
                      const amount = Math.floor(target.cash * 0.20);
                      db.prepare('UPDATE teams SET cash = cash - ? WHERE id = ?').run(amount, targetTeamId);
                      db.prepare('UPDATE teams SET cash = cash + ? WHERE id = ?').run(amount, teamId);
                      logTransaction(teamId, roomId, 'HOSTILE_BID_WIN', amount, 'Won Hostile Bid');
                  }
              } else if (targetTeamId && coinTossResult === 'LOSS') {
                  const amount = Math.floor(team.cash * 0.20);
                  db.prepare('UPDATE teams SET cash = cash - ? WHERE id = ?').run(amount, teamId);
                  db.prepare('UPDATE teams SET cash = cash + ? WHERE id = ?').run(amount, targetTeamId);
                  logTransaction(teamId, roomId, 'HOSTILE_BID_LOSS', -amount, 'Lost Hostile Bid');
              }
              break;
          case 'BOOM':
              allTeams.forEach(t => {
                  const boomAmt = Math.floor(t.cash * 0.20);
                  db.prepare('UPDATE teams SET cash = cash + ? WHERE id = ?').run(boomAmt, t.id);
              });
              logTransaction(teamId, roomId, 'BOOM', 0, 'Economic Boom');
              break;
          case 'ROBIN_HOOD':
              const robinFirst = db.prepare('SELECT immune FROM teams WHERE id = ?').get(firstPlace.id);
              if (!robinFirst || !robinFirst.immune) {
                  const robinStolen = Math.floor(firstPlace.cash * 0.30);
                  db.prepare('UPDATE teams SET cash = cash - ? WHERE id = ?').run(robinStolen, firstPlace.id);
                  const othersCount = allTeams.length - 1;
                  if (othersCount > 0) {
                      const robinShare = Math.floor(robinStolen / othersCount);
                      db.prepare('UPDATE teams SET cash = cash + ? WHERE room = ? AND id != ?').run(robinShare, roomId, firstPlace.id);
                  }
                  logTransaction(teamId, roomId, 'ROBIN_HOOD', 0, 'The Robin Hood');
              }
              break;
          case 'BLACK_SWAN':
              // This acts as a flag for the frontend to render the global event
              break;
          case 'ANGEL_INVESTOR':
              db.prepare('UPDATE teams SET cash = cash + 1000, blindFaith = 1 WHERE id = ?').run(teamId);
              logTransaction(teamId, roomId, 'ANGEL_INVESTOR', 1000, 'Angel Investor');
              break;
          case 'HIGH_STAKES_COIN':
              if (coinTossResult === 'HEADS') {
                  const winAmt = Math.floor(team.cash * 0.33);
                  db.prepare('UPDATE teams SET cash = cash + ? WHERE id = ?').run(winAmt, teamId);
                  logTransaction(teamId, roomId, 'COIN_WIN', winAmt, 'High Stakes Win');
              } else {
                  db.prepare('UPDATE teams SET cash = cash + 1000 WHERE room = ? AND id != ?').run(roomId, teamId);
                  logTransaction(teamId, roomId, 'COIN_LOSS', 0, 'High Stakes Loss');
              }
              break;
      }
      
      io.emit('stateUpdate', getGlobalState());
  });

  socket.on('resolveCornerEvent', ({ teamId, roomId, eventType, coinTossResult, targetTeamId }) => {
      const team = db.prepare('SELECT name, cash FROM teams WHERE id = ?').get(teamId);
      if (!team) return;

      if (eventType === 'ANGEL_INVESTMENT') {
          const invested = Math.floor(team.cash / 2);
          if (coinTossResult === 'HEADS') {
              const won = invested * 3; // Triples investment
              // Net gain is won - invested
              db.prepare('UPDATE teams SET cash = cash + ? WHERE id = ?').run(won - invested, teamId);
              logTransaction(teamId, roomId, 'ANGEL_WIN', won - invested, 'Angel Investment Win');
          } else {
              db.prepare('UPDATE teams SET cash = cash - ? WHERE id = ?').run(invested, teamId);
              logTransaction(teamId, roomId, 'ANGEL_LOSS', -invested, 'Angel Investment Loss');
          }
      } else if (eventType === 'CORPORATE_BUYOUT' && targetTeamId) {
          if (coinTossResult === 'WIN') {
              const target = db.prepare('SELECT cash FROM teams WHERE id = ?').get(targetTeamId);
              if (target) {
                  db.prepare('UPDATE teams SET cash = cash - 1000 WHERE id = ?').run(targetTeamId);
                  db.prepare('UPDATE teams SET cash = cash + 1000 WHERE id = ?').run(teamId);
                  logTransaction(teamId, roomId, 'BUYOUT_WIN', 1000, 'Won Corporate Buyout');
              }
          } else if (coinTossResult === 'LOSS') {
              db.prepare('UPDATE teams SET cash = cash - 1000 WHERE id = ?').run(teamId);
              db.prepare('UPDATE teams SET cash = cash + 1000 WHERE id = ?').run(targetTeamId);
              logTransaction(teamId, roomId, 'BUYOUT_LOSS', -1000, 'Lost Corporate Buyout');
          }
      } else if (eventType === 'WHITE_COLLAR_PRISON') {
          db.prepare('UPDATE teams SET frozen = 1, immune = 1 WHERE id = ?').run(teamId);
          logTransaction(teamId, roomId, 'JAIL', 0, 'Sent to White Collar Prison');
      }

      io.emit('stateUpdate', getGlobalState());
  });
  
  socket.on('advanceEra', () => {
      const state = db.prepare('SELECT currentEraId FROM app_state WHERE id = 1').get();
      const currentIdx = erasDb.findIndex(e => e.id === state.currentEraId);
      let nextEra = erasDb[currentIdx + 1];
      if (!nextEra) {
          nextEra = erasDb[0]; 
      }
      db.prepare('UPDATE app_state SET currentEraId = ?, currentEraName = ? WHERE id = 1').run(nextEra.id, nextEra.name);
      
      const rooms = db.prepare('SELECT id FROM rooms').all();
      rooms.forEach(r => {
          initializeRoomDeck(r.id);
          db.prepare("UPDATE rooms SET eraStatus = 'ACTIVE' WHERE id = ?").run(r.id);
      });
      
      db.prepare('UPDATE teams SET eraStartingCash = cash').run();

      
      io.emit('stateUpdate', getGlobalState());
  });
  
  socket.on('cornerAction', ({ teamId, actionType, amount }) => {
      let diff = 0;
      if (actionType === 'START') {
          diff = 200;
      } else if (actionType === 'GAMBLE_WIN') {
          diff = amount;
      } else if (actionType === 'GAMBLE_LOSS') {
          diff = -amount;
      } else if (actionType === 'PENALTY') {
          diff = -amount;
      }
      
      if (diff !== 0) {
          db.prepare('UPDATE teams SET cash = cash + ? WHERE id = ?').run(diff, teamId);
      }
      io.emit('stateUpdate', getGlobalState());
  });
  
  socket.on('resetGame', () => {
    db.prepare('DELETE FROM teams').run();
    db.prepare('DELETE FROM rooms').run();
    db.prepare('DELETE FROM transactions').run();
    const defaultEra = erasDb.find(e => e.investments.length === 72) || erasDb[0];
    db.prepare('UPDATE app_state SET currentEraId = ?, currentEraName = ? WHERE id = 1').run(defaultEra.id, defaultEra.name);
    console.log('Game reset: all teams, rooms, and transactions cleared.');
    io.emit('stateUpdate', getGlobalState());
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
