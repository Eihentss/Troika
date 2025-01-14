<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeckCard extends Model
{
    // Norādām, kuras kolonnas ir pieejamas masveida aizpildīšanai
    protected $fillable = ['code', 'image', 'suit', 'value'];

    /**
     * Attiecības, ja tās nepieciešamas nākotnē.
     * Piemēram, ja deck_card būs saistīts ar lobbiju.
     */
}
