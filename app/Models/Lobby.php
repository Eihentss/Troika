<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Lobby extends Model
{
    use HasFactory;

    // Fillable fields to allow mass assignment
    protected $fillable = [
        'name', 
        'code', 
        'creator_id', 
        'max_players', 
        'current_players', 
        'status', 
        'spectate_allowed', 
        'is_private', 
        'password',
        'round_number', 
        'game_ranking',
        'game_started_at', 
        'game_ended_at'
    ];

    // Casts for type conversion
    protected $casts = [
        'spectate_allowed' => 'boolean',
        'is_private' => 'boolean',
        'game_started_at' => 'datetime',
        'game_ended_at' => 'datetime'
    ];

    // Relationship with User (creator)
    public function creator()
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    // Generate a unique lobby code
    public static function generateUniqueCode()
    {
        do {
            $code = rand(100000, 999999);
        } while (self::where('code', $code)->exists());

        return $code;
    }

    public function players()
    {
        return $this->belongsToMany(User::class, 'lobby_user')
            ->withPivot('status') // Include the status field from the pivot table
            ->withTimestamps();
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'lobby_user')->withPivot('status')->withTimestamps();
    }
}