<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\DeckCard;
use Illuminate\Support\Facades\Http;

class DeckCardsSeeder extends Seeder
{
    public function run()
    {
        // Pārbaudīt, vai kārtis jau ir datubāzē
        if (DeckCard::count() > 0) {
            $this->command->info('Deck cards already seeded.');
            return;
        }

        try {
            // Izveidot jaunu kāršu kavu
            $deckResponse = Http::get('https://deckofcardsapi.com/api/deck/new/shuffle/');
            if (!$deckResponse->successful()) {
                $this->command->error('Failed to create deck.');
                return;
            }

            $deckId = $deckResponse->json()['deck_id'];

            // Izvilkt 54 kārtis no kavas
            $drawResponse = Http::get("https://deckofcardsapi.com/api/deck/{$deckId}/draw/?count=52");
            if (!$drawResponse->successful()) {
                $this->command->error('Failed to draw cards from deck.');
                return;
            }

            $cards = $drawResponse->json()['cards'];

            // Sagatavot datus ievietošanai datubāzē
            $cardData = array_map(function ($card) {
                return [
                    'code' => $card['code'],
                    'type' => 'in_deck',
                    'image' => $card['image'],
                    'suit' => $card['suit'],
                    'value' => $card['value'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }, $cards);

            // Ievietot datus datubāzē
            Card::insert($cardData);

            $this->command->info('Deck cards seeded successfully from API.');
        } catch (\Exception $e) {
            $this->command->error('An error occurred: ' . $e->getMessage());
        }
    }
}
