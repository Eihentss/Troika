<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateCardsTable extends Migration
{
    public function up()
    {
        Schema::create('cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lobby_id')->constrained('lobbies')->onDelete('cascade');
            $table->unsignedBigInteger('player_id')->nullable(); // Pareizais tips
            $table->enum('type', ['face_up', 'face_down','hand', 'played', 'discarded','in_deck','in_play_area_last_card'])->default('in_deck');
            $table->string('code');
            $table->string('image');
            $table->string('suit');
            $table->string('value');
            $table->timestamps();
        
            $table->foreign('player_id')->references('id')->on('users')->onDelete('cascade'); 
        });
    }

    public function down()
    {
        Schema::dropIfExists('cards');
    }
}
