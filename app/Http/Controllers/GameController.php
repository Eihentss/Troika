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


public function playCard($lobbyId, Request $request)
{
    // Get the current player (the one who is playing)
    $user = auth()->user();

    // Find the card that the player is trying to play from their hand
    $card = Card::where('lobby_id', $lobbyId)
                ->where('player_id', $user->id)
                ->where('type', 'hand') // Ensure it's in their hand
                ->first();

    // If no card is found in the player's hand, check if they can draw from the face_up pile
    if (!$card) {
        // Attempt to get cards from the face_up pile if the hand is empty
        $cardFromFaceUp = Card::where('lobby_id', $lobbyId)
                              ->where('player_id', $user->id)
                              ->where('type', 'face_up') // Look for cards in face_up
                              ->first();

        if (!$cardFromFaceUp) {
            // If no card in hand or face_up, try to draw from face_down
            $cardFromFaceDown = Card::where('lobby_id', $lobbyId)
                                    ->where('player_id', $user->id)
                                    ->where('type', 'face_down') // Look for cards in face_down
                                    ->first();

            if (!$cardFromFaceDown) {
                return response()->json(['error' => 'No cards available to play'], 400); // If no card is found in any pile
            }

            // Mark the card from face_down as played
            $cardFromFaceDown->update(['type' => 'played']);
            return response()->json(['playedCard' => $cardFromFaceDown]);
        }

        // Mark the card from face_up as played
        $cardFromFaceUp->update(['type' => 'played']);
        return response()->json(['playedCard' => $cardFromFaceUp]);
    }

    // Mark the card from hand as played
    $card->update(['type' => 'played']);

    // Check how many cards the player currently has in their hand
    $playerHandCount = Card::where('lobby_id', $lobbyId)
                           ->where('player_id', $user->id)
                           ->where('type', 'hand')
                           ->count();

    // If the player has fewer than 3 cards in hand, give them more cards
    $cardsToGive = 3 - $playerHandCount;
    if ($cardsToGive > 0) {
        // First, try to get cards from the deck
        $randomCards = Card::where('lobby_id', $lobbyId)
                           ->where('type', 'in_deck')
                           ->inRandomOrder() // Randomly select cards
                           ->limit($cardsToGive)
                           ->get();

        if ($randomCards->isEmpty()) {
            // If no cards are left in the deck, try to get cards from the face_up pile
            $randomCards = Card::where('lobby_id', $lobbyId)
                               ->where('type', 'face_up')
                               ->inRandomOrder() // Randomly select cards
                               ->limit($cardsToGive)
                               ->get();
        }

        if ($randomCards->isEmpty()) {
            // If no cards are available in the face_up pile, try the face_down pile
            $randomCards = Card::where('lobby_id', $lobbyId)
                               ->where('type', 'face_down')
                               ->inRandomOrder() // Randomly select cards
                               ->limit($cardsToGive)
                               ->get();
        }

        // If there are still no cards left, return an error
        if ($randomCards->isEmpty()) {
            return response()->json(['error' => 'No cards available to draw'], 400);
        }

        // Move cards from either the deck, face_up, or face_down pile to the player's hand
        foreach ($randomCards as $randomCard) {
            $randomCard->update([
                'type' => 'hand',
                'player_id' => $user->id // Assign the card to the player
            ]);
        }
    }

    // Return success response with the played card and any new cards given
    return response()->json([
        'playedCard' => $card,
        'newCards' => $cardsToGive > 0 ? $randomCards : [], // Include new cards if any
        'message' => "Played card: {$card->suit} {$card->value} (Code: {$card->code})"
    ]);
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
            // Shuffle players and assign turn order
            $players = $lobby->players->shuffle();
            $firstPlayer = $players->first();

            foreach ($players as $player) {
                // Set 'current_turn' in the pivot table
                $player->pivot->current_turn = ($player->id === $firstPlayer->id) ? 'true' : 'false';
                $player->pivot->save();
            }

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



public function getCurrentTurnPlayer($lobbyId)
{
    $player = \DB::table('lobby_user')
        ->join('users', 'lobby_user.user_id', '=', 'users.id')
        ->where('lobby_user.lobby_id', $lobbyId)
        ->where('lobby_user.current_turn', true)
        ->select('users.name')
        ->first();

    if ($player) {
        return response()->json(['name' => $player->name]);
    }

    return response()->json(['error' => 'Current turn player not found'], 404);
}




public function game($lobbyId)
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
                'message' => 'You have left the game successfully',
            ], 200);
}

            return response()->json([
                'message' => 'You are not the creator of this lobby',
            ], 500);
    }
}
