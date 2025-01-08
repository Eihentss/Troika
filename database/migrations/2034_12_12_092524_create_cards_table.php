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
            $table->unsignedBigInteger('player_id'); // Pareizais tips
            $table->enum('type', ['face_up', 'face_down']);
            $table->string('code');
            $table->string('image');
            $table->string('suit');
            $table->string('value');
            $table->timestamps();
        
            $table->foreign('player_id')->references('id')->on('users')->onDelete('cascade');        });
    }

    public function down()
    {
        Schema::dropIfExists('cards');
    }
}
