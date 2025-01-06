<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lobbies', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->foreignId('creator_id')->constrained('users');
            
            // Shithead game-specific columns
            $table->integer('max_players')->default(4); // Maximum 4 players as specified
            $table->integer('current_players')->default(1); // Start with creator
            $table->enum('status', ['waiting', 'playing', 'finished'])->default('waiting');
            $table->boolean('spectate_allowed')->default(true); // Allow spectators
            
            // Additional game configuration
            $table->boolean('is_private')->default(false); // Private vs public lobby
            $table->string('password', 255)->nullable();
            $table->integer('round_number')->default(0); // Track game rounds
            $table->enum('game_ranking', ['ranked', 'unranked'])->default('unranked');            

            $table->timestamp('game_started_at')->nullable(); // When game actually begins
            $table->timestamp('game_ended_at')->nullable(); // When game concludes
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lobbies');
    }
};