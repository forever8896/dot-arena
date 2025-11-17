import { io } from 'socket.io-client';

/**
 * NetworkManager - Enhanced Socket.IO client wrapper
 *
 * Handles all server communication with:
 * - Connection management
 * - Event callbacks
 * - Latency measurement
 * - Reconnection handling
 */
export default class NetworkManager {
  constructor(serverUrl = 'http://localhost:3001') {
    this.serverUrl = serverUrl;
    this.socket = null;
    this.playerId = null;
    this.isConnected = false;
    this.callbacks = {};

    // Latency measurement
    this.pingInterval = null;
    this.latency = 0;
    this.lastPingTime = 0;

    console.log(`🌐 NetworkManager created, will connect to ${serverUrl}`);
  }

  connect() {
    return new Promise((resolve, reject) => {
      console.log(`🔌 Connecting to ${this.serverUrl}...`);

      // Create socket
      this.socket = io(this.serverUrl, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
        timeout: 5000
      });

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout - is the server running?'));
      }, 5000);

      // Connection established
      this.socket.on('connect', () => {
        console.log('✅ Connected to server');
        this.isConnected = true;
        clearTimeout(timeout);
        this.startPingMeasurement();
        this.trigger('connect');
      });

      // Initial game state
      this.socket.on('init', (data) => {
        console.log('🎮 Received initial state:', data);
        this.playerId = data.playerId;
        this.trigger('init', data);
        resolve(data);
      });

      // Game state updates (every tick)
      this.socket.on('gameState', (state) => {
        this.trigger('gameState', state);
      });

      // Player joined
      this.socket.on('playerJoined', (playerData) => {
        console.log(`👋 Player joined: ${playerData.id}`);
        this.trigger('playerJoined', playerData);
      });

      // Player left
      this.socket.on('playerLeft', (playerId) => {
        console.log(`👋 Player left: ${playerId}`);
        this.trigger('playerLeft', playerId);
      });

      // Player hit
      this.socket.on('playerHit', (data) => {
        this.trigger('playerHit', data);
      });

      // Player killed
      this.socket.on('playerKilled', (data) => {
        console.log(`💀 Kill: ${data.killerId} → ${data.victimId}`);
        this.trigger('playerKilled', data);
      });

      // Player respawned
      this.socket.on('playerRespawned', (data) => {
        console.log(`♻️  Player respawned: ${data.playerId}`);
        this.trigger('playerRespawned', data);
      });

      // Weapon picked up
      this.socket.on('weaponPickedUp', (data) => {
        console.log(`🔫 Weapon pickup: ${data.playerId} → ${data.newWeapon}`);
        this.trigger('weaponPickedUp', data);
      });

      // Weapon respawned
      this.socket.on('weaponRespawned', (pickupId) => {
        this.trigger('weaponRespawned', pickupId);
      });

      // Disconnection
      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected:', reason);
        this.isConnected = false;
        this.stopPingMeasurement();
        this.trigger('disconnect', reason);
      });

      // Reconnection
      this.socket.on('reconnect', (attemptNumber) => {
        console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
        this.isConnected = true;
        this.startPingMeasurement();
        this.trigger('reconnect');
      });

      this.socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 Reconnect attempt ${attemptNumber}...`);
      });

      this.socket.on('reconnect_failed', () => {
        console.error('❌ Reconnection failed');
        this.trigger('reconnect_failed');
      });

      // Connection error
      this.socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error.message);
        clearTimeout(timeout);
        this.trigger('connect_error', error);
        reject(error);
      });

      // Pong for latency measurement
      this.socket.on('pong', (timestamp) => {
        this.latency = Date.now() - timestamp;
        this.trigger('latencyUpdate', this.latency);
      });
    });
  }

  /**
   * Send player input to server
   */
  sendInput(inputData) {
    if (!this.isConnected || !this.socket) {
      console.warn('⚠️  Not connected, cannot send input');
      return false;
    }

    this.socket.emit('input', inputData);
    return true;
  }

  /**
   * Attempt to pick up weapon
   */
  pickupWeapon(pickupId) {
    if (!this.isConnected || !this.socket) return false;

    this.socket.emit('pickupWeapon', pickupId);
    return true;
  }

  /**
   * Start measuring network latency
   */
  startPingMeasurement() {
    if (this.pingInterval) return;

    this.pingInterval = setInterval(() => {
      if (this.isConnected && this.socket) {
        const now = Date.now();
        this.lastPingTime = now;
        this.socket.emit('ping', now);
      }
    }, 1000); // Ping every second
  }

  /**
   * Stop measuring network latency
   */
  stopPingMeasurement() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Get current network latency in ms
   */
  getLatency() {
    return this.latency;
  }

  /**
   * Register event callback
   */
  on(event, callback) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  /**
   * Unregister event callback
   */
  off(event, callback) {
    if (!this.callbacks[event]) return;
    this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
  }

  /**
   * Trigger event callbacks
   */
  trigger(event, data) {
    if (!this.callbacks[event]) return;

    this.callbacks[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} callback:`, error);
      }
    });
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting...');
      this.stopPingMeasurement();
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.playerId = null;
    }
  }

  /**
   * Check if connected
   */
  isSocketConnected() {
    return this.isConnected && this.socket && this.socket.connected;
  }

  /**
   * Get connection state for debugging
   */
  getConnectionState() {
    return {
      connected: this.isConnected,
      playerId: this.playerId,
      latency: this.latency,
      serverUrl: this.serverUrl
    };
  }
}
