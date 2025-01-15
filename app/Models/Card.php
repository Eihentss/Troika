<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Card extends Model
{
    protected $fillable = ['lobby_id','player_id','current_turn', 'type', 'code', 'image', 'suit', 'value'];
    // Kārtis pieder spēlētājam
    public function player()
    {
        return $this->belongsTo(Player::class);
    }
}
