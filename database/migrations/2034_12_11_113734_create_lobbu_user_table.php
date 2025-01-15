<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lobby_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lobby_id')->constrained('lobbies')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            
            $table->enum('current_turn',['true', 'false'])->default('false');
            $table->enum('status', ['waiting', 'ready', 'not ready', 'spectator', 'playing'])->default('not ready');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lobby_user');
    }
};