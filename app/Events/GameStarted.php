<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Queue\SerializesModels;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Broadcasting\InteractsWithSockets;

class GameStarted
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $userId;
    public $lobbyId;

    public function __construct($userId, $lobbyId)
    {
        $this->userId = $userId;
        $this->lobbyId = $lobbyId;
    }

    public function broadcastOn()
    {
        return new Channel('game-channel');
    }
}
