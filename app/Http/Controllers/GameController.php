<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use App\Models\Lobby;
use App\Models\Card; // Pievienot modeli, kas saglabā kārtis
use Illuminate\Support\Facades\Http;

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

        // Pārbaude, vai spēle ir sākusies
        if ($lobby->status !== 'playing') {
            return redirect()->route('lobbies.index')->with('error', 'The game has not started yet.');
        }

        // Pārbauda, vai spēlētājiem ir piešķirtas kārtis
        if ($lobby->cards->isEmpty()) {
            $this->dealCards($lobby);
        }

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
            'currentUserId' => auth()->id()
        ]);
    }

    /**
     * Piešķir kārtis spēlētājiem un saglabā tās datubāzē
     */
    private function dealCards(Lobby $lobby)
    {
        // Izveido jaunu kaudzi un sadala kārtis
        $response = Http::get('https://deckofcardsapi.com/api/deck/new/shuffle/');
        $deckId = $response->json()['deck_id'];

        // Iegūst 18 kārtis (katram spēlētājam pa 3 face-up un 3 face-down kārtīm)
        $dealResponse = Http::get("https://deckofcardsapi.com/api/deck/{$deckId}/draw/?count=18");
        $cards = $dealResponse->json()['cards'];

        // Sadala kārtis pa spēlētājiem
        $cardData = [];
        foreach ($lobby->players as $index => $player) {
            $cardData[$player->id] = [
                'faceDown' => array_slice($cards, $index * 3, 3),
                'faceUp' => array_slice($cards, $index * 3 + 3, 3)
            ];
        }

        // Saglabā kārtis datubāzē vai saistītajos modeļos
        foreach ($cardData as $playerId => $cards) {
            foreach ($cards['faceDown'] as $card) {
                Card::create([
                    'player_id' => $playerId,
                    'type' => 'face_down',
                    'code' => $card['code'],
                    'image' => $card['image'],
                    'suit' => $card['suit'],
                    'value' => $card['value'],
                ]);
            }
            foreach ($cards['faceUp'] as $card) {
                Card::create([
                    'player_id' => $playerId,
                    'type' => 'face_up',
                    'code' => $card['code'],
                    'image' => $card['image'],
                    'suit' => $card['suit'],
                    'value' => $card['value'],
                ]);
            }
        }

        // Atjaunina spēles statusu uz "playing"
        $lobby->update(['status' => 'playing']);
    }
}