<?php

namespace App\Http\Controllers;

use App\Models\Player;
use Illuminate\Support\Facades\Auth;
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
            $lobby = Lobby::with(['players', 'cards'])->findOrFail($lobbyId);
    
            // Check if the current user is in the lobby
            if (!$lobby->players->contains(auth()->id())) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }
    
            // Validate the card input
            $request->validate([
                'card_code' => 'required|string',
            ]);
    
            // Check if it's the user's turn
            if ($lobby->current_turn_player_id !== auth()->id()) {
                return response()->json(['error' => 'Not your turn'], 403);
            }
    
            // Find the card and ensure it belongs to the current player
            $card = Card::where('player_id', auth()->id())
                ->where('code', $request->input('card_code'))
                ->where('type', '!=', 'played') // Ensure card hasn't been played already
                ->first();
    
            if (!$card) {
                return response()->json(['error' => 'Card not found or already played'], 404);
            }
    
            // Update the card type to 'played'
            $card->type = 'played';
            $card->save();
    
            // Get the next player in the lobby
            $currentPlayerIndex = $lobby->players->search(function($player) {
                return $player->id === auth()->id();
            });
    
            $nextPlayerIndex = ($currentPlayerIndex + 1) % count($lobby->players);
            $nextPlayer = $lobby->players->values()->get($nextPlayerIndex);
    
            // Update the turn to the next player
            $lobby->current_turn_player_id = $nextPlayer->id;
            $lobby->save();
    
            return response()->json([
                'message' => 'Card played successfully',
                'card' => $card,
                'nextPlayerId' => $nextPlayer->id
            ]);
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


    public function advanceTurn($lobbyId)
    {
        $lobby = Lobby::with(['players' => function ($query) {
            $query->orderBy('lobby_user.turn_order');
        }])->findOrFail($lobbyId);
    
        $currentPlayerPivot = $lobby->players->where('id', $lobby->current_turn_user_id)->first()->pivot;
        $nextTurnOrder = $currentPlayerPivot->turn_order + 1;
    
        $nextPlayer = $lobby->players->where('pivot.turn_order', $nextTurnOrder)->first();
        if (!$nextPlayer) {
            // If no next player, wrap around to the first player
            $nextPlayer = $lobby->players->where('pivot.turn_order', 1)->first();
        }
    
        $lobby->current_turn_user_id = $nextPlayer->id;
        $lobby->save();
    
        return $nextPlayer;
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
        $drawResponse = Http::get("https://deckofcardsapi.com/api/deck/{$deckId}/draw/?count=52");
        if (!$drawResponse->successful()) {
            Log::error('Failed to draw cards', [
                'lobby_id' => $lobbyId,
                'deck_id' => $deckId,
                'response' => $drawResponse->json()
            ]);
            return response()->json(['error' => 'Failed to draw cards'], 500);
        }

        $cards = $drawResponse->json()['cards'];
        $cardIndex = 0;
        $status = ["hand", "face_up", "face_down"];

        \DB::beginTransaction();
        try {
            // Assign turn order to players
            $players = $lobby->players->shuffle();
            foreach ($players as $index => $player) {
                $player->pivot->turn_order = $index + 1;
                $player->pivot->save();
            }

            // Set the first player's turn
            $firstPlayer = $players->first();
            $lobby->current_turn_user_id = $firstPlayer->id;
            $lobby->save();

            // Deal cards to players
            foreach ($players as $player) {
                foreach ($status as $cardStatus) {
                    for ($i = 0; $i < 3; $i++) {
                        Card::create([
                            'lobby_id' => $lobbyId,
                            'player_id' => $player->id,
                            'type' => $cardStatus,
                            'code' => $cards[$cardIndex]['code'],
                            'image' => $cards[$cardIndex]['image'],
                            'suit' => $cards[$cardIndex]['suit'],
                            'value' => $cards[$cardIndex]['value'],
                        ]);
                        $cardIndex++;
                    }
                }
            }

            // Add remaining cards to deck
            for ($i = $cardIndex; $i < count($cards); $i++) {
                $card = $cards[$i];
                Card::create([
                    'lobby_id' => $lobbyId,
                    'player_id' => null,
                    'type' => 'in_deck',
                    'code' => $card['code'],
                    'image' => $card['image'],
                    'suit' => $card['suit'],
                    'value' => $card['value'],
                ]);
            }

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
            $cards = Card::all();

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

    public function leaveGame($lobbyId)
    {
        $lobby = Lobby::find($lobbyId);

        if ($lobby->creator_id === Auth::id()) {


        $lobby->delete();

            return response()->json([
                'message' => 'Eihentas ir mazu bernu pisejs',
            ], 200);
}

            return response()->json([
                'message' => 'Eihentas ir mazu bernu pisejs',
            ], 500);
    }
}
