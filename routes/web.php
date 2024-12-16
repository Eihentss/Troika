<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\LobbyController;
use App\Http\Controllers\ChatController;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
        'canLogin' => Route::has('login'),
    ]);
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::get('/learn', function () {
    return Inertia::render('LearnRules');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::post('/api/lobbies', [LobbyController::class, 'store']);
    Route::get('/api/lobbies', [LobbyController::class, 'index'])->name('lobbies.index')->middleware(['auth', 'verified']);
    Route::get('/api/lobbies/{lobby}', [LobbyController::class, 'show'])->name('lobby.show');
    Route::get('/api/lobbies/{lobby}/leave', [LobbyController::class, 'leave']);
    Route::delete('/api/lobbies/delete-by-creator', [LobbyController::class, 'deleteByUser']);
    Route::post('/lobbies/{lobbyId}/join', [LobbyController::class, 'joinLobby']);
    Route::post('/api/lobbies/{lobbyId}/leave', [LobbyController::class, 'leaveLobby']);
    Route::post('/api/lobbies/{lobby}/toggle-ready', [LobbyController::class, 'toggleReadyStatus']);

    Route::post('/api/lobbies/{lobby}/start', [LobbyController::class, 'startGame']);




    Route::get('/api/lobbies/{lobby}/chat-history', [LobbyController::class, 'getChatHistory']);
    Route::post('/api/lobbies/{lobby}/chat', [LobbyController::class, 'sendMessage']);

    //nejiet route ;/

    Route::get('/api/lobbies/find-by-code/{code}', [LobbyController::class, 'findByCode']);
    Route::delete('/api/lobbies/delete-by-creator', [LobbyController::class, 'deleteByUser']);

});

require __DIR__.'/auth.php';
