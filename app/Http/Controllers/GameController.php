<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use App\Models\Lobby;
use Illuminate\Http\Request;
use App\Models\Card;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class GameController extends Controller
{

    public function show($lobbyId)
    {
        $lobby = Lobby::with('players')->findOrFail($lobbyId);
    
        // Ensure the user is part of this lobby
        $userInLobby = $lobby->players->contains(auth()->id());
    
        if (!$userInLobby) {
            return redirect()->route('lobbies.index')
                ->with('error', 'You are not a member of this game lobby.');
        }
    
        // Check if the game has started
        if ($lobby->status !== 'playing') {
            return redirect()->route('lobbies.index')->with('error', 'The game has not started yet.');
        }
    
        // Get the current turn player ID from the lobby or logic
        $currentTurnPlayerId = $lobby->current_turn_player_id ?? $lobby->players->first()->id; // Default to the first player
    
        $players = $lobby->players->map(function ($player) {
            return [
                'id' => $player->id,
                'name' => $player->name,
                'status' => $player->pivot->status
            ];
        });
    
        return Inertia::render('Game', [
            'lobby' => $lobby,
            'players' => $players,
            'is_creator' => auth()->id() === $lobby->creator_id,
            'currentUserId' => auth()->id(),
            'currentTurnPlayerId' => $currentTurnPlayerId // Pārsūti uz klientu
        ]);
    }
    

    public function playCard(Request $request, $lobbyId)
    {
        try {
            $lobby = Lobby::with('players')->findOrFail($lobbyId);
    
            // Check if the current user is in the lobby
            if (!$lobby->players->contains(auth()->id())) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }
    
            // Validate the card input
            $request->validate([
                'card_code' => 'required|string',
            ]);
    
            // Check if it's the user's turn
 
            
    
            // Find the card and ensure it belongs to the current player
            $card = Card::where('player_id', auth()->id())
            ->where('code', $request->input('card_code'))
            ->first();
        if (!$card) {
            return response()->json(['error' => 'Card not found'], 404);
        }
    
            // Save the played card in a new "played_cards" table or update the card type
            $playedCard = $card->replicate();
            $playedCard->type = 'played';
            $playedCard->save();
    
            // Remove the card from the player's hand
            $card->delete();
    
            // Update the turn to the next player
            $nextPlayer = $lobby->players->pluck('id')->filter(fn($id) => $id !== auth()->id())->first();
            $lobby->current_turn_player_id = $nextPlayer;
            $lobby->save();
    
            return response()->json(['message' => 'Card played successfully', 'card' => $playedCard]);
        } catch (Exception $e) {
            Log::error('Failed to play card', [
                'lobby_id' => $lobbyId,
                'error' => $e->getMessage()
            ]);
    
            return response()->json([
                'error' => 'Failed to play card',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    
public function switchTurn($lobbyId)
{
    $lobby = Lobby::findOrFail($lobbyId);

    if (auth()->id() !== $lobby->creator_id) {
        return response()->json(['error' => 'Unauthorized'], 403);
    }

    $players = $lobby->players;
    $currentTurnIndex = $players->pluck('id')->search($lobby->current_turn);

    $nextTurnIndex = ($currentTurnIndex + 1) % $players->count();
    $nextTurnPlayerId = $players[$nextTurnIndex]->id;

    $lobby->update(['current_turn' => $nextTurnPlayerId]);

    return response()->json(['current_turn' => $nextTurnPlayerId]);
}

    public function initialize($lobbyId)
    {
        try {
            $lobby = Lobby::with('players')->findOrFail($lobbyId);
            
            // Verify user permissions
            if (auth()->id() !== $lobby->creator_id) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            // Check if cards are already dealt
            $existingCards = Card::whereIn('player_id', $lobby->players->pluck('id'))->exists();
            if ($existingCards) {
                return response()->json(['message' => 'Cards already dealt']);
            }

            // Log the start of card dealing
            Log::info('Starting to deal cards for lobby: ' . $lobbyId);

            // Make API request to get new deck
            $deckResponse = Http::get('https://deckofcardsapi.com/api/deck/new/shuffle/');
            if (!$deckResponse->successful()) {
                Log::error('Failed to create deck', [
                    'lobby_id' => $lobbyId,
                    'response' => $deckResponse->json()
                ]);
                return response()->json(['error' => 'Failed to create deck'], 500);
            }

            $deckId = $deckResponse->json()['deck_id'];
            
            // Draw cards
            $drawResponse = Http::get("https://deckofcardsapi.com/api/deck/{$deckId}/draw/?count=54");
            if (!$drawResponse->successful()) {
                Log::error('Failed to draw cards', [
                    'lobby_id' => $lobbyId,
                    'deck_id' => $deckId,
                    'response' => $drawResponse->json()
                ]);
                return response()->json(['error' => 'Failed to draw cards'], 500);
            }

            $cards = $drawResponse->json()['cards'];

            // Begin database transaction
            \DB::beginTransaction();
            try {
                foreach ($lobby->players as $index => $player) {
                    // Deal face-down cards
                    for ($i = 0; $i < 3; $i++) {
                        $card = $cards[$index * 3 + $i];
                        Card::create([
                            'player_id' => $player->id,
                            'type' => 'face_down',
                            'code' => $card['code'],
                            'image' => $card['image'],
                            'suit' => $card['suit'],
                            'value' => $card['value'],
                        ]);
                    }

                    // Deal face-up cards
                    for ($i = 0; $i < 3; $i++) {
                        $card = $cards[$index * 3 + $i + 9];
                        Card::create([
                            'player_id' => $player->id,
                            'type' => 'face_up',
                            'code' => $card['code'],
                            'image' => $card['image'],
                            'suit' => $card['suit'],
                            'value' => $card['value'],
                        ]);
                    }
                }

                // Update lobby status
                $lobby->update(['status' => 'playing']);
                
                \DB::commit();
                Log::info('Successfully dealt cards for lobby: ' . $lobbyId);
                
                return response()->json(['message' => 'Game initialized successfully']);
            } catch (Exception $e) {
                \DB::rollBack();
                Log::error('Failed to save cards to database', [
                    'lobby_id' => $lobbyId,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                throw $e;
            }
        } catch (Exception $e) {
            Log::error('Game initialization failed', [
                'lobby_id' => $lobbyId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Game initialization failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getCards($lobbyId)
    {
        try {
            $lobby = Lobby::with('players')->findOrFail($lobbyId);
            
            $cards = [];
            foreach ($lobby->players as $player) {
                $playerCards = Card::where('player_id', $player->id)->get();
                $cards[$player->id] = $playerCards;
            }
            
            return response()->json($cards);
        } catch (Exception $e) {
            Log::error('Failed to retrieve cards', [
                'lobby_id' => $lobbyId,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'error' => 'Failed to retrieve cards',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}