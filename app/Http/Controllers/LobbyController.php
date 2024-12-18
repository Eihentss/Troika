<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Lobby;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use App\Models\ChatMessage; // Correct namespace
use App\Events\ChatMessageSent; // Add this import

class LobbyController extends Controller
{
    public function store(Request $request)
    {

            $user = auth()->user();

            Lobby::where('creator_id', $user->id)->delete();

        // Validate the request with new configuration options
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'creator_id' => 'required|exists:users,id',
            'max_players' => 'integer|min:2|max:4|nullable',
            'spectate_allowed' => 'boolean|nullable',
            'is_private' => 'boolean|nullable',
            'game_ranking' => 'in:ranked,unranked|nullable'
        ]);
    
        // Generate a unique 6-digit code
        $validated['code'] = Lobby::generateUniqueCode();
        
        // Set default values if not provided
        $validated['max_players'] = $validated['max_players'] ?? 4;
        $validated['current_players'] = 1; // Start with creator
        $validated['status'] = 'waiting';
        $validated['spectate_allowed'] = $validated['spectate_allowed'] ?? true;
        $validated['is_private'] = $validated['is_private'] ?? false;
        $validated['game_ranking'] = $validated['game_ranking'] ?? 'unranked';
        $validated['round_number'] = 0;
        $validated['creator_id'] = $user->id;
    
        // Create new lobby
        $lobby = Lobby::create($validated);

            // Automatically add the creator to the lobby_user table
    \DB::table('lobby_user')->insert([
        'lobby_id' => $lobby->id,
        'user_id' => $lobby->creator_id,
        'status' => 'not ready',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    
        // Return the created lobby
        return response()->json($lobby, 201);
    }

public function index()
{
    $user = auth()->user();

    $lobbies = Lobby::with(['creator', 'players'])
        ->orderBy('created_at', 'desc')
        ->paginate(9)
        ->through(function ($lobby) use ($user) {
            $lobby->is_current_user_in_lobby = $lobby->players->contains('id', $user->id);
            return $lobby;
        });

    return Inertia::render('LobbiesIndex', [
        'lobbies' => $lobbies,
    ]);
}

public function show($id)
{
    // Find the lobby with its players
    $lobby = Lobby::with('players')->find($id);

    if (!$lobby) {
        return response()->json(['message' => 'Lobby not found'], 404);
    }

    $lobby = Lobby::with(['players' => function ($query) {
        $query->select('users.id', 'users.name', 'lobby_user.status'); // Select specific fields
    }])->find($id);

    // Check if it's an API request or regular Inertia request
    if (request()->expectsJson()) {
        return response()->json($lobby);
    }

    return Inertia::render('LobbyPage', [
        'lobby' => $lobby,
    ]);
}

    public function findByCode($code)
    {
        // Search for the lobby by the given code
        $lobby = Lobby::where('code', $code)->firstOrFail();

        return response()->json([
            'id' => $lobby->id,
            'name' => $lobby->name,
            'creator_id' => $lobby->creator_id,
            'max_players' => $lobby->max_players,
            'current_players' => $lobby->current_players,
            'spectate_allowed' => $lobby->spectate_allowed,
            'is_private' => $lobby->is_private,
            'game_ranking' => $lobby->game_ranking,
        ]);
    }

    public function deleteByUser($userId)
    {
        $deletedCount = Lobby::where('creator_id', $userId)->delete();

        return response()->json([
            'message' => "Deleted $deletedCount lobbies created by user with ID $userId",
            'deleted_count' => $deletedCount
        ], 200);
    }


public function joinLobby($lobbyId)
{
    // Get the current user
    $user = auth()->user();
    
    // Find the lobby
    $lobby = Lobby::findOrFail($lobbyId);

    // Check if the user is already in the lobby
    $userAlreadyInLobby = \DB::table('lobby_user')
        ->where('lobby_id', $lobby->id)
        ->where('user_id', $user->id)
        ->exists();

    if ($userAlreadyInLobby) {
        return response()->json([
            'message' => 'You are already a member of this lobby',
            'status' => 'error'
        ], 400);
    }

    // Check if the lobby is full
    if ($lobby->current_players >= $lobby->max_players) {
        return response()->json(['message' => 'Lobby is full'], 400);
    }

    // Start a transaction to ensure both operations succeed
    \DB::beginTransaction();

    try {
        // Increment the current players count
        $lobby->increment('current_players');

        // Add the user to the lobby_user table
        \DB::table('lobby_user')->insert([
            'lobby_id' => $lobby->id,
            'user_id' => $user->id,
            'status' => 'not ready',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Commit the transaction
        \DB::commit();

        return response()->json(['message' => 'Successfully joined the lobby'], 200);
    } catch (\Exception $e) {
        // Rollback the transaction if something goes wrong
        \DB::rollBack();
        return response()->json([
            'message' => 'Failed to join the lobby', 
            'error' => $e->getMessage()
        ], 500);
    }
}
public function leaveLobby($lobbyId)
{
    // Get the current user
    $user = auth()->user();

    // Find the lobby
    $lobby = Lobby::findOrFail($lobbyId);

    // Check if the user is in the lobby
    $userInLobby = \DB::table('lobby_user')
        ->where('lobby_id', $lobby->id)
        ->where('user_id', $user->id)
        ->exists();

    if (!$userInLobby) {
        return response()->json(['message' => 'You are not part of this lobby'], 400);
    }

    // Start a transaction to ensure both operations succeed
    \DB::beginTransaction();

    try {
        // Decrement the current players count
        $lobby->decrement('current_players');

        // Remove the user from the lobby_user table
        \DB::table('lobby_user')
            ->where('lobby_id', $lobby->id)
            ->where('user_id', $user->id)
            ->delete();

        // Check if the current user is the creator of the lobby
        if ($lobby->creator_id === $user->id) {
            // Delete the lobby if the creator leaves
            $lobby->delete();
        }

        // Commit the transaction
        \DB::commit();

        return response()->json(['message' => 'Successfully left the lobby'], 200);
    } catch (\Exception $e) {
        // Rollback the transaction if something goes wrong
        \DB::rollBack();
        return response()->json(['message' => 'Failed to leave the lobby'], 500);
    }
}


public function checkUserInLobby($lobbyId)
{
    $user = auth()->user();
    
    $userInLobby = \DB::table('lobby_user')
        ->where('lobby_id', $lobbyId)
        ->where('user_id', $user->id)
        ->exists();

    return response()->json([
        'is_in_lobby' => $userInLobby
    ]);
}


public function toggleReadyStatus($lobbyId)
{
    // Get the current user
    $user = auth()->user();

    if (!$user) {
        return response()->json(['message' => 'User not authenticated'], 401);
    }

    // Find the lobby
    $lobby = Lobby::findOrFail($lobbyId);

    // Check if the user is in the lobby
    $lobbyUser = DB::table('lobby_user')
        ->where('lobby_id', $lobby->id)
        ->where('user_id', $user->id)
        ->first();

    if (!$lobbyUser) {
        return response()->json(['message' => 'You are not in this lobby'], 400);
    }

    // Toggle the user's ready status
    $newStatus = $lobbyUser->status === 'ready' ? 'not ready' : 'ready';

    try {
        DB::table('lobby_user')
            ->where('lobby_id', $lobby->id)
            ->where('user_id', $user->id)
            ->update([
                'status' => $newStatus,
                'updated_at' => now()
            ]);

        return response()->json([
            'message' => 'Ready status updated',
            'status' => $newStatus
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'message' => 'Failed to update ready status',
            'error' => $e->getMessage()
        ], 500);
    }
}

public function startGame($lobbyId)
{
    $lobby = Lobby::with('players')->findOrFail($lobbyId);

    // Check if the current user is already playing
    $currentUser = auth()->user();
    $userInLobby = DB::table('lobby_user')
        ->where('lobby_id', $lobbyId)
        ->where('user_id', $currentUser->id)
        ->first();

    if ($userInLobby && $userInLobby->status === 'playing') {
        // Redirect to the game page for players with 'playing' status
        return Inertia::render('Game', [
            'lobby' => $lobby,
            'players' => $lobby->players->map(function ($player) {
                return [
                    'id' => $player->id,
                    'name' => $player->name,
                    'status' => 'playing'
                ];
            }),
            'is_creator' => $currentUser->id === $lobby->creator_id
        ]);
    }

    // Ensure only the creator can start the game
    if (auth()->id() !== $lobby->creator_id) {
        return response()->json(['message' => 'Unauthorized'], 403);
    }

    // Update all players' status to playing
    DB::table('lobby_user')
        ->where('lobby_id', $lobbyId)
        ->update([
            'status' => 'playing',
            'updated_at' => now()
        ]);

    // Update lobby game start time
    $lobby->update([
        'game_started_at' => now(),
        'status' => 'playing'
    ]);

    // Prepare player data
    $players = $lobby->players->map(function ($player) {
        return [
            'id' => $player->id,
            'name' => $player->name,
            'status' => 'playing'
        ];
    });

    // For the creator, render the Game page
    return Inertia::render('Game', [
        'lobby' => $lobby,
        'players' => $players,
        'is_creator' => true
    ]);
}



    public function getChatHistory($lobbyId)
    {
        $messages = ChatMessage::where('lobby_id', $lobbyId)
            ->with('user')
            ->latest()
            ->take(50)
            ->get();

        return response()->json($messages);
    }

public function sendMessage(Request $request, $lobbyId)
{
    try {
        $validatedData = $request->validate([
            'message' => 'required|string|max:60'
        ]);

        $message = ChatMessage::create([
            'lobby_id' => $lobbyId,
            'user_id' => auth()->id(),
            'message' => $validatedData['message']
        ]);

        broadcast(new \App\Events\ChatMessageSent($message))->toOthers();

        return response()->json($message, 201);
    } catch (\Exception $e) {
        \Log::error('Chat message error: ' . $e->getMessage());
        return response()->json([
            'message' => 'Error sending message',
            'error' => $e->getMessage()
        ], 500);
    }
}

}